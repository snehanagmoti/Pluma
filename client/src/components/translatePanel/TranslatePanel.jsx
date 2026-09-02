import React, { useState } from "react";
import { MdTranslate, MdClose } from "react-icons/md";
import API from "../../config/axios";
import "./TranslatePanel.css";

const LANGUAGES = [
  { code: "Hindi", label: "हिन्दी (Hindi)" },
  { code: "Spanish", label: "Español (Spanish)" },
  { code: "French", label: "Français (French)" },
  { code: "German", label: "Deutsch (German)" },
  { code: "Japanese", label: "日本語 (Japanese)" },
  { code: "Chinese", label: "中文 (Chinese)" },
  { code: "Korean", label: "한국어 (Korean)" },
  { code: "Arabic", label: "العربية (Arabic)" },
  { code: "Portuguese", label: "Português (Portuguese)" },
  { code: "Russian", label: "Русский (Russian)" },
  { code: "Marathi", label: "मराठी (Marathi)" },
  { code: "Tamil", label: "தமிழ் (Tamil)" },
  { code: "Telugu", label: "తెలుగు (Telugu)" },
  { code: "Bengali", label: "বাংলা (Bengali)" },
];

export default function TranslatePanel({ text, onClose }) {
  const [targetLang, setTargetLang] = useState("Hindi");
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!text) return;
    setLoading(true);
    try {
      const res = await API.post("/ai/translate", {
        text: text.substring(0, 5000),
        targetLanguage: targetLang,
      });
      
      if (res.data.source === "fallback" && res.data.message) {
        setTranslated(res.data.message);
      } else {
        setTranslated(res.data.result);
      }
    } catch (err) {
      setTranslated("Translation failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="translateOverlay">
      <div className="translatePanel">
        <div className="translateHeader">
          <div className="translateHeaderLeft">
            <MdTranslate className="translateIcon" />
            <h3>Translate</h3>
          </div>
          <button className="translateClose" onClick={onClose}>
            <MdClose />
          </button>
        </div>

        <div className="translateControls">
          <select
            className="translateSelect"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <button
            className="translateBtn"
            onClick={handleTranslate}
            disabled={loading}
          >
            {loading ? "Translating..." : "Translate"}
          </button>
        </div>

        {translated && (
          <div className="translateResult">
            <p>{translated}</p>
          </div>
        )}
      </div>
    </div>
  );
}
