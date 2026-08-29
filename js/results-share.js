import { validateCompleteQuestionnaireState } from "./questionnaire-serialization.js";
import { createQuestionnaireShareUrl } from "./questionnaire-url.js";

export const RESULTS_SHARE_ACTION_LABEL = "Share results";
export const RESULTS_SHARE_PRIVACY_DISCLOSURE =
  "Anyone with this link can view the questionnaire choices included in it.";
export const RESULTS_SHARE_COPY_SUCCESS = "Recommendation link copied.";
export const RESULTS_SHARE_MANUAL_COPY = "Copy this link manually.";

const COPY_RESULTS = new Set(["copied", "unavailable", "failed"]);

function frozenResult(status) {
  return Object.freeze({ status });
}

function defaultClipboard() {
  try {
    return globalThis.navigator?.clipboard ?? null;
  } catch {
    return null;
  }
}

export function isCompleteQuestionnaireStateShareable(input) {
  return validateCompleteQuestionnaireState(input).valid;
}

export function createResultsShareUrl(input, baseUrl) {
  const validation = validateCompleteQuestionnaireState(input);
  if (!validation.valid) {
    throw new TypeError("Only validated complete questionnaire state can be shared from results.");
  }
  return createQuestionnaireShareUrl(validation.state, baseUrl);
}

export async function copyShareUrl(url, { clipboard = defaultClipboard() } = {}) {
  if (typeof url !== "string" || url.length === 0) return frozenResult("failed");
  if (!clipboard) return frozenResult("unavailable");

  try {
    const writeText = clipboard.writeText;
    if (typeof writeText !== "function") return frozenResult("unavailable");
    await Reflect.apply(writeText, clipboard, [url]);
    return frozenResult("copied");
  } catch {
    return frozenResult("failed");
  }
}

export function getShareCopyPresentation(status) {
  if (!COPY_RESULTS.has(status)) {
    return Object.freeze({ message: "", showFallback: false });
  }
  return status === "copied"
    ? Object.freeze({ message: RESULTS_SHARE_COPY_SUCCESS, showFallback: false })
    : Object.freeze({ message: RESULTS_SHARE_MANUAL_COPY, showFallback: true });
}

function setLiveText(element, message) {
  element.textContent = message;
  element.hidden = false;
}

export function initialiseResultsShare({
  getQuestionnaireState,
  getBaseUrl = () => window.location.href,
  getClipboard = defaultClipboard,
} = {}) {
  const area = document.querySelector("#results-share");
  const trigger = document.querySelector("#results-share-trigger");
  const panel = document.querySelector("#results-share-panel");
  const title = document.querySelector("#results-share-title");
  const copyButton = document.querySelector("#results-share-copy");
  const closeButton = document.querySelector("#results-share-close");
  const status = document.querySelector("#results-share-status");
  const fallback = document.querySelector("#results-share-fallback");
  const urlField = document.querySelector("#results-share-url");

  if (
    !area || !trigger || !panel || !title || !copyButton || !closeButton || !status ||
    !fallback || !urlField || typeof getQuestionnaireState !== "function"
  ) {
    return Object.freeze({
      clear() {},
      hide() {},
      show() { return false; },
    });
  }

  let shareUrl = "";
  let copyAttempt = 0;

  const clearCopyFeedback = () => {
    copyAttempt += 1;
    status.textContent = "";
    status.hidden = true;
    fallback.hidden = true;
    urlField.value = "";
  };

  const closePanel = ({ restoreFocus = false } = {}) => {
    clearCopyFeedback();
    shareUrl = "";
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  };

  const hide = () => {
    closePanel();
    area.hidden = true;
  };

  const show = () => {
    try {
      if (!isCompleteQuestionnaireStateShareable(getQuestionnaireState())) {
        hide();
        return false;
      }
    } catch {
      hide();
      return false;
    }
    closePanel();
    area.hidden = false;
    return true;
  };

  trigger.addEventListener("click", () => {
    if (!panel.hidden) {
      closePanel();
      return;
    }

    clearCopyFeedback();
    try {
      shareUrl = createResultsShareUrl(getQuestionnaireState(), getBaseUrl());
    } catch {
      shareUrl = "";
      setLiveText(status, "A share link could not be prepared.");
    }
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    title.focus();
  });

  closeButton.addEventListener("click", () => closePanel({ restoreFocus: true }));

  copyButton.addEventListener("click", async () => {
    clearCopyFeedback();
    const attempt = copyAttempt;
    if (!shareUrl) {
      setLiveText(status, "A share link could not be prepared.");
      return;
    }

    let clipboard = null;
    try {
      clipboard = getClipboard();
    } catch {
      // A throwing Clipboard API is handled as unavailable.
    }
    const copyResult = await copyShareUrl(shareUrl, { clipboard });
    if (attempt !== copyAttempt || panel.hidden) return;

    const presentation = getShareCopyPresentation(copyResult.status);
    setLiveText(status, presentation.message);
    if (presentation.showFallback) {
      urlField.value = shareUrl;
      fallback.hidden = false;
      window.requestAnimationFrame(() => {
        urlField.focus();
        urlField.select();
      });
    }
  });

  return Object.freeze({
    clear: hide,
    hide,
    show,
  });
}
