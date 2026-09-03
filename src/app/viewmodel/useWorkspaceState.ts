import { useEffect, useReducer, useRef } from "react";

import type { AgentUXEvent } from "../../agentux";
import type { AppLocale } from "../../i18n/uiCopy";
import {
  createInitialWorkspaceState,
  workspaceReducer,
  type WorkspaceDispatch,
  type WorkspaceState,
} from "../state/workspaceState";

/** Mutable side-effect handles that live beside the reducer (timers, aborts, pending frames). */
export type WorkspaceRefs = {
  standardStreamRef: { current: { cancel: () => void } | undefined };
  liveAbortControllerRef: { current: AbortController | undefined };
  piAbortControllerRef: { current: AbortController | undefined };
  pendingLiveEventsRef: { current: readonly AgentUXEvent[] | undefined };
  liveFlushHandleRef: { current: number | undefined };
  previewRefreshTimerRef: { current: number | undefined };
  outputPanelSignatureRef: { current: string };
};

/**
 * Owns the workspace state machine plus the refs its side effects need.
 *
 * Split from the action factory so App can derive view models from `state`
 * before wiring the controller — the controller consumes those derivations,
 * which would be circular if state and actions lived in one hook.
 */
export function useWorkspaceState(locale: AppLocale) {
  const [state, dispatch] = useReducer(workspaceReducer, locale, createInitialWorkspaceState);

  const standardStreamRef = useRef<{ cancel: () => void } | undefined>(undefined);
  const liveAbortControllerRef = useRef<AbortController | undefined>(undefined);
  const piAbortControllerRef = useRef<AbortController | undefined>(undefined);
  const pendingLiveEventsRef = useRef<readonly AgentUXEvent[] | undefined>(undefined);
  const liveFlushHandleRef = useRef<number | undefined>(undefined);
  const previewRefreshTimerRef = useRef<number | undefined>(undefined);
  const outputPanelSignatureRef = useRef("");
  const previousLocaleRef = useRef(locale);

  useEffect(() => {
    if (previousLocaleRef.current === locale) {
      return;
    }
    dispatch({ type: "localeDefaultPromptSwapped", from: previousLocaleRef.current, to: locale });
    previousLocaleRef.current = locale;
  }, [locale]);

  useEffect(() => () => {
    if (previewRefreshTimerRef.current) {
      window.clearTimeout(previewRefreshTimerRef.current);
    }
  }, []);

  const refs: WorkspaceRefs = {
    standardStreamRef,
    liveAbortControllerRef,
    piAbortControllerRef,
    pendingLiveEventsRef,
    liveFlushHandleRef,
    previewRefreshTimerRef,
    outputPanelSignatureRef,
  };

  return { state, dispatch, refs } as const;
}
