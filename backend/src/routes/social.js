const router = require("express").Router();
const SocialPost = require("../models/SocialPost");
const User = require("../models/User");
const Group = require("../models/Group");
const { verifyToken } = require("../middleware/auth");
const { createNotification, createNotifications } = require("../utils/notifications");

const populatePost = query => query
  .populate("author", "username avatar profilePicture")
  .populate("book", "title cover authorName privacy userId")
  .populate("channel", "name kind emoji")
  .populate("comments.user", "username avatar profilePicture");

const protectPrivateBook = (post, viewerId) => {
  if (post?.book?.privacy === "private" && post.book.userId !== viewerId) post.book = null;
  return post;
};

router.get("/posts", verifyToken, async (req, res) => {
  try {
    const { scope = "latest", channelId, q } = req.query;
    const filter = {};

    if (channelId) {
      const channel = await Group.findById(channelId).select("isPrivate members").lean();
      if (!channel) return res.status(404).json({ message: "Channel not found" });
      const isMember = channel.members.some(member => member.toString() === req.user.id);
      if (channel.isPrivate && !isMember) {
        return res.status(403).json({ message: "This is a private channel" });
      }
      filter.channel = channelId;
    } else {
      const visibleChannels = await Group.find({
        $or: [{ isPrivate: false }, { members: req.user.id }],
      }).distinct("_id");
      filter.$and = [{ $or: [{ channel: null }, { channel: { $in: visibleChannels } }] }];
    }
    if (q?.trim()) filter.$text = { $search: q.trim() };
    if (scope === "following") {
      const user = await User.findById(req.user.id).select("followings").lean();
      filter.author = { $in: [req.user.id, ...(user?.followings || [])] };
    }

    let posts = await populatePost(SocialPost.find(filter).sort({ createdAt: -1 }).limit(100)).lean();
    if (scope === "trending") {
      posts = posts.sort((a, b) =>
        (b.likes.length + b.comments.length * 2 + b.reposts.length * 2) -
        (a.likes.length + a.comments.length * 2 + a.reposts.length * 2)
      );
    }
    posts = posts.map(post => protectPrivateBook(post, req.user.id));

    res.status(200).json(posts);
  } catch (error) {
    console.error("Fetch social posts error:", error);
    res.status(500).json({ message: "Failed to fetch the community feed" });
  }
});

router.post("/posts", verifyToken, async (req, res) => {
  try {
    const { text, kind, book, channel, image } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Post text is required" });

    let group = null;
    if (channel) {
      group = await Group.findById(channel);
      if (!group) return res.status(404).json({ message: "Channel not found" });
      if (!group.members.some(member => member.toString() === req.user.id)) {
        return res.status(403).json({ message: "Join this channel before posting" });
      }
    }

    const post = await SocialPost.create({
      author: req.user.id,
      text: text.trim(),
      kind,
      book: book || null,
      channel: channel || null,
      image: image || "",
    });

    const populated = protectPrivateBook(
      await populatePost(SocialPost.findById(post._id)).lean(),
      req.user.id
    );
    if (group) {
      await createNotifications({
        recipients: group.members,
        actor: req.user.id,
        type: "channel_post",
        text: `${populated.author?.username || "A member"} posted in ${group.name}`,
        link: `/groups/${group._id}`,
        entityId: post._id,
      });
    }
    res.status(201).json(populated);
  } catch (error) {
    console.error("Create social post error:", error);
    res.status(500).json({ message: "Failed to publish post" });
  }
});

router.put("/posts/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.channel) {
      const channel = await Group.findById(post.channel).select("isPrivate members").lean();
      if (!channel || (channel.isPrivate && !channel.members.some(member => member.toString() === req.user.id))) {
        return res.status(403).json({ message: "This post belongs to a private channel" });
      }
    }
    const liked = post.likes.some(id => id.toString() === req.user.id);
    if (liked) post.likes.pull(req.user.id);
    else post.likes.addToSet(req.user.id);
    await post.save();

    if (!liked) {
      const actor = await User.findById(req.user.id).select("username").lean();
      await createNotification({
        recipient: post.author,
        actor: req.user.id,
        type: "post_like",
        text: `${actor?.username || "Someone"} liked your post`,
        link: "/community",
        entityId: post._id,
      });
    }
    res.status(200).json({ liked: !liked, likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: "Failed to update like" });
  }
});

router.put("/posts/:id/repost", verifyToken, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.channel) {
      const channel = await Group.findById(post.channel).select("isPrivate members").lean();
      if (!channel || (channel.isPrivate && !channel.members.some(member => member.toString() === req.user.id))) {
        return res.status(403).json({ message: "This post belongs to a private channel" });
      }
    }
    const reposted = post.reposts.some(id => id.toString() === req.user.id);
    if (reposted) post.reposts.pull(req.user.id);
    else post.reposts.addToSet(req.user.id);
    await post.save();
    res.status(200).json({ reposted: !reposted, reposts: post.reposts });
  } catch (error) {
    res.status(500).json({ message: "Failed to repost" });
  }
});

router.post("/posts/:id/comments", verifyToken, async (req, res) => {
  try {
    if (!req.body.text?.trim()) return res.status(400).json({ message: "Comment text is required" });
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.channel) {
      const channel = await Group.findById(post.channel).select("isPrivate members").lean();
      if (!channel || (channel.isPrivate && !channel.members.some(member => member.toString() === req.user.id))) {
        return res.status(403).json({ message: "This post belongs to a private channel" });
      }
    }
    post.comments.push({ user: req.user.id, text: req.body.text.trim() });
    await post.save();

    const actor = await User.findById(req.user.id).select("username").lean();
    await createNotification({
      recipient: post.author,
      actor: req.user.id,
      type: "post_comment",
      text: `${actor?.username || "Someone"} replied to your post`,
      link: "/community",
      entityId: post._id,
    });

    const populated = protectPrivateBook(
      await populatePost(SocialPost.findById(post._id)).lean(),
      req.user.id
    );
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to add reply" });
  }
});

router.delete("/posts/:id", verifyToken, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own posts" });
    }
    await post.deleteOne();
    res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete post" });
  }
});

module.exports = router;
