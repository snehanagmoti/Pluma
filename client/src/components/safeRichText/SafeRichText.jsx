import React, { useMemo } from "react";

const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "blockquote", "h1", "h2", "h3", "ul", "ol", "li", "a", "img", "code", "pre"]);

const safeUrl = (value, image = false) => {
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === "https:" || (!image && url.protocol === "http:")) return url.href;
  } catch (error) {}
  return "";
};

const renderNode = (node, key) => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const tag = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes).map((child, index) => renderNode(child, `${key}-${index}`));
  if (!ALLOWED.has(tag)) return <React.Fragment key={key}>{children}</React.Fragment>;
  if (tag === "a") {
    const href = safeUrl(node.getAttribute("href") || "");
    return href ? <a key={key} href={href} target="_blank" rel="noreferrer noopener">{children}</a> : <React.Fragment key={key}>{children}</React.Fragment>;
  }
  if (tag === "img") {
    const src = safeUrl(node.getAttribute("src") || "", true);
    return src ? <img key={key} src={src} alt={String(node.getAttribute("alt") || "Story illustration").slice(0, 180)} loading="lazy" /> : null;
  }
  return React.createElement(tag, { key }, children);
};

export default function SafeRichText({ html = "", className = "" }) {
  const content = useMemo(() => {
    const value = String(html || "");
    if (!value.includes("<")) return value.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>);
    const documentValue = new DOMParser().parseFromString(value, "text/html");
    return Array.from(documentValue.body.childNodes).map((node, index) => renderNode(node, `node-${index}`));
  }, [html]);
  return <div className={className}>{content}</div>;
}
