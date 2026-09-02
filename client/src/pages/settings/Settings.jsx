import React, { useState, useEffect } from "react";
import "./Settings.css";
import Topbar from "../../components/topbar/Topbar";
import API from "../../config/axios";
import { FaUser, FaLock, FaTrashAlt, FaSave, FaRobot, FaKey } from "react-icons/fa";
import { MdAutoAwesome } from "react-icons/md";

const PROVIDER_OPTIONS = [
  { value: "gemini", label: "Google Gemini", models: ["gemini-3.7-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"] },
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"] },
  { value: "anthropic", label: "Anthropic", models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"] },
];

export default function Settings() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [username, setUsername] = useState(user?.username || "");
  const email = user?.email || "";
  const [bio, setBio] = useState(user?.bio || "");
  const [city, setCity] = useState(user?.city || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // AI Settings State
  const [aiKeys, setAiKeys] = useState({ openai: "", anthropic: "", gemini: "" });
  const [aiModels, setAiModels] = useState({
    draftProvider: "gemini", draftModel: "",
    editProvider: "gemini", editModel: "",
    brainstormProvider: "gemini", brainstormModel: "",
    summarizeProvider: "gemini", summarizeModel: "",
  });
  const [aiPrefs, setAiPrefs] = useState({ defaultTone: "", styleGuide: "", autoFleshOut: false });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [maskedKeys, setMaskedKeys] = useState({});

  const avatar = user?.avatar || user?.profilePicture;

  // Load AI settings on mount
  useEffect(() => {
    if (activeTab === "ai") {
      API.get("/ai/settings")
        .then((res) => {
          if (res.data.apiKeys) setMaskedKeys(res.data.apiKeys);
          if (res.data.preferredModels) setAiModels(prev => ({ ...prev, ...res.data.preferredModels }));
          if (res.data.aiPreferences) setAiPrefs(prev => ({ ...prev, ...res.data.aiPreferences }));
        })
        .catch(() => {});
    }
  }, [activeTab]);

  const handleSave = async () => {
    if (password && password !== confirmPassword) {
      setMessage("Passwords don't match!");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const body = { username, bio, city };
      if (password) body.password = password;
      await API.put(`/users/${user._id}`, body);
      const updated = { ...user, username, bio, city };
      localStorage.setItem("user", JSON.stringify(updated));
      setMessage("Settings saved successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save settings.");
    }
    setSaving(false);
  };

  const handleSaveAiSettings = async () => {
    setAiSaving(true);
    setAiMessage("");
    try {
      const payload = {
        preferredModels: aiModels,
        aiPreferences: aiPrefs,
      };
      // Only include API keys if they were changed (not masked)
      const newKeys = {};
      if (aiKeys.openai && !aiKeys.openai.startsWith("****")) newKeys.openai = aiKeys.openai;
      if (aiKeys.anthropic && !aiKeys.anthropic.startsWith("****")) newKeys.anthropic = aiKeys.anthropic;
      if (aiKeys.gemini && !aiKeys.gemini.startsWith("****")) newKeys.gemini = aiKeys.gemini;
      if (Object.keys(newKeys).length > 0) payload.apiKeys = newKeys;

      await API.put("/ai/settings", payload);
      setAiMessage("AI settings saved successfully!");
      setAiKeys({ openai: "", anthropic: "", gemini: "" }); // Clear raw keys from state
    } catch (err) {
      setAiMessage("Failed to save AI settings.");
    }
    setAiSaving(false);
  };

  const handleDeleteAccount = async () => {
    try {
      await API.delete(`/users/${user._id}`);
      localStorage.clear();
      window.location.href = "/login";
    } catch (err) {
      setMessage("Failed to delete account.");
    }
  };

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiMessage("");
    try {
      const response = await API.post("/ai/test", { task: "draft" });
      setAiMessage(response.data.ready ? `Connected to ${response.data.provider} · ${response.data.model}` : "The provider responded unexpectedly.");
    } catch (error) {
      setAiMessage(error.response?.data?.message || "The selected AI provider could not be reached.");
    } finally {
      setAiTesting(false);
    }
  };

  const getModelsForProvider = (provider) => {
    return PROVIDER_OPTIONS.find((p) => p.value === provider)?.models || [];
  };

  return (
    <>
      <Topbar />
      <div className="settingsPage">
        <div className="settingsContainer">
          <h1 className="settingsTitle">Account Settings</h1>

          {/* Tab Navigation */}
          <div className="settingsTabs">
            <button
              className={`settingsTab ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <FaUser /> Profile
            </button>
            <button
              className={`settingsTab ${activeTab === "ai" ? "active" : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              <FaRobot /> AI Models
            </button>
          </div>

          {/* ═══ PROFILE TAB ═══ */}
          {activeTab === "profile" && (
            <>
              {message && (
                <div className={`settingsMessage ${message.includes("success") ? "success" : "error"}`}>
                  {message}
                </div>
              )}

              <div className="settingsCard">
                <h2 className="settingsCardTitle"><FaUser /> Profile</h2>
                <div className="settingsAvatar">
                  <div className="settingsAvatarCircle">
                    {avatar ? (
                      <img src={avatar} alt="" className="settingsAvatarImg" />
                    ) : (
                      <span>{username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="settingsAvatarInfo">
                    <span className="settingsAvatarName">{username}</span>
                    <span className="settingsAvatarProvider">
                      {user?.authProvider === "google" ? "Signed in with Google" : "Email account"}
                    </span>
                  </div>
                </div>

                <div className="settingsField">
                  <label>Username</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="settingsField">
                  <label>Email</label>
                  <input value={email} disabled className="disabled" />
                  <span className="settingsFieldHint">Email cannot be changed</span>
                </div>
                <div className="settingsField">
                  <label>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                  />
                  <span className="settingsFieldHint">{bio.length}/500</span>
                </div>
                <div className="settingsField">
                  <label>City</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city" />
                </div>
              </div>

              {user?.authProvider !== "google" && (
                <div className="settingsCard">
                  <h2 className="settingsCardTitle"><FaLock /> Security</h2>
                  <div className="settingsField">
                    <label>New Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" minLength={6} />
                  </div>
                  <div className="settingsField">
                    <label>Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                  </div>
                </div>
              )}

              <button className="settingsSaveBtn" onClick={handleSave} disabled={saving}>
                <FaSave /> {saving ? "Saving..." : "Save Changes"}
              </button>

              <div className="settingsCard dangerZone">
                <h2 className="settingsCardTitle danger"><FaTrashAlt /> Danger Zone</h2>
                <p className="dangerText">
                  Once you delete your account, there is no going back. All your books and data will be permanently removed.
                </p>
                <button className="deleteAccountBtn" onClick={() => setShowDeleteModal(true)}>
                  Delete My Account
                </button>
              </div>
            </>
          )}

          {/* ═══ AI SETTINGS TAB ═══ */}
          {activeTab === "ai" && (
            <>
              {aiMessage && (
                <div className={`settingsMessage ${aiMessage.includes("success") ? "success" : "error"}`}>
                  {aiMessage}
                </div>
              )}

              {/* API Keys */}
              <div className="settingsCard aiSettingsCard">
                <h2 className="settingsCardTitle">
                  <FaKey /> API Keys (BYOK)
                </h2>
                <p className="aiSettingsDesc">
                  Bring Your Own Key — enter a provider API key to use its writing models. Keys are encrypted at rest and never returned to the browser. Gemini API has a separate developer free tier; consumer Google AI and ChatGPT subscriptions do not automatically fund server API calls.
                </p>

                {PROVIDER_OPTIONS.map((provider) => (
                  <div className="settingsField" key={provider.value}>
                    <label>
                      {provider.label} API Key
                      {maskedKeys[provider.value] && (
                        <span className="keyStatus active">
                          Active ({maskedKeys[provider.value]})
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={aiKeys[provider.value]}
                      onChange={(e) => setAiKeys({ ...aiKeys, [provider.value]: e.target.value })}
                      placeholder={
                        maskedKeys[provider.value]
                          ? `Current: ${maskedKeys[provider.value]}`
                          : `Enter your ${provider.label} API key`
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Model Preferences */}
              <div className="settingsCard aiSettingsCard">
                <h2 className="settingsCardTitle">
                  <MdAutoAwesome /> Model Preferences
                </h2>
                <p className="aiSettingsDesc">
                  Choose which AI model to use for different writing tasks. Use Claude for creative prose,
                  Different tasks can use different providers. The server automatically falls back to Gemini when a non-Gemini provider is temporarily unavailable and a Gemini key is configured.
                </p>

                {[
                  { key: "draft", label: "✍️ Drafting & Writing", desc: "Creative prose, scene writing, story continuation" },
                  { key: "edit", label: "✏️ Editing & Polishing", desc: "Grammar fixes, tone shifts, prose improvement" },
                  { key: "brainstorm", label: "💡 Brainstorming", desc: "Ideas, outlines, plot twists, character development" },
                  { key: "summarize", label: "📋 Summarizing", desc: "Chapter summaries, character extraction, analysis" },
                ].map(({ key, label, desc }) => (
                  <div className="modelPrefRow" key={key}>
                    <div className="modelPrefLabel">
                      <strong>{label}</strong>
                      <span>{desc}</span>
                    </div>
                    <div className="modelPrefSelects">
                      <select
                        value={aiModels[`${key}Provider`]}
                        onChange={(e) => setAiModels({ ...aiModels, [`${key}Provider`]: e.target.value, [`${key}Model`]: "" })}
                        className="modelPrefSelect"
                      >
                        {PROVIDER_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <select
                        value={aiModels[`${key}Model`]}
                        onChange={(e) => setAiModels({ ...aiModels, [`${key}Model`]: e.target.value })}
                        className="modelPrefSelect"
                      >
                        <option value="">Default</option>
                        {getModelsForProvider(aiModels[`${key}Provider`]).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Writing Preferences */}
              <div className="settingsCard aiSettingsCard">
                <h2 className="settingsCardTitle">
                  <FaRobot /> Writing Preferences
                </h2>
                <div className="settingsField">
                  <label>Default Tone</label>
                  <select
                    value={aiPrefs.defaultTone}
                    onChange={(e) => setAiPrefs({ ...aiPrefs, defaultTone: e.target.value })}
                  >
                    <option value="">Auto</option>
                    <option value="dramatic">Dramatic</option>
                    <option value="humorous">Humorous</option>
                    <option value="romantic">Romantic</option>
                    <option value="suspenseful">Suspenseful</option>
                    <option value="poetic">Poetic</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div className="settingsField">
                  <label>Style Guide</label>
                  <textarea
                    value={aiPrefs.styleGuide}
                    onChange={(e) => setAiPrefs({ ...aiPrefs, styleGuide: e.target.value })}
                    placeholder="e.g., Clear sensory prose, tightly defined magic rules, epic scale, and witty dialogue"
                    rows={2}
                  />
                </div>
                <div className="settingsField" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    id="autoFlesh"
                    checked={aiPrefs.autoFleshOut}
                    onChange={(e) => setAiPrefs({ ...aiPrefs, autoFleshOut: e.target.checked })}
                  />
                  <label htmlFor="autoFlesh" style={{ margin: 0 }}>Auto-expand rough drafts (Flesh It Out)</label>
                </div>
              </div>

              <button className="settingsSaveBtn aiSaveBtn" onClick={handleSaveAiSettings} disabled={aiSaving}>
                <FaSave /> {aiSaving ? "Saving..." : "Save AI Settings"}
              </button>
              <button className="settingsSaveBtn aiTestBtn" onClick={handleTestAi} disabled={aiTesting}>
                <FaRobot /> {aiTesting ? "Testing..." : "Test saved AI setup"}
              </button>
            </>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="deleteModalOverlay">
              <div className="deleteModal">
                <h3>Are you absolutely sure?</h3>
                <p>This action cannot be undone. All your books, chapters, and profile data will be permanently deleted.</p>
                <div className="deleteModalActions">
                  <button className="deleteModalCancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button className="deleteModalConfirm" onClick={handleDeleteAccount}>Yes, Delete My Account</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
