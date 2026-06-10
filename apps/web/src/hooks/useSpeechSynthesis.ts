import { useCallback, useEffect, useMemo, useState } from "react";

interface SpeakOptions {
  lang?: string;
  rate?: number;
}

export interface SpeechSynthesisControls {
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string, options?: SpeakOptions) => void;
  cancel: () => void;
}

export function useSpeechSynthesis(): SpeechSynthesisControls {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!canUseSpeechSynthesis()) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, []);

  const preferredVoices = useMemo(() => {
    return voices.filter((voice) => voice.lang.toLowerCase().startsWith("zh"));
  }, [voices]);

  const cancel = useCallback(() => {
    if (!canUseSpeechSynthesis()) {
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      const normalizedText = text.trim();

      if (!normalizedText || !canUseSpeechSynthesis()) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(normalizedText);
      utterance.lang = options.lang ?? "zh-CN";
      utterance.rate = options.rate ?? 0.82;
      utterance.voice = chooseVoice(preferredVoices, utterance.lang);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [preferredVoices],
  );

  return {
    isSupported,
    isSpeaking,
    speak,
    cancel,
  };
}

function canUseSpeechSynthesis(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

function chooseVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const normalizedLang = lang.toLowerCase();

  return (
    voices.find((voice) => voice.lang.toLowerCase() === normalizedLang) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("zh-cn")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("zh")) ??
    null
  );
}
