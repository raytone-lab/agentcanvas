import { PanelLeft, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { appVersionLabel } from "../../appVersion";
import { useCopy, useLocale } from "../../i18n/LocaleContext";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";

export type SessionSidebarItem = { id: string; title: string };

/**
 * Conversation-history rail for the scaffolded agent product: new chat, search,
 * and a grouped list of recent sessions. Which parts show is driven by the
 * project's `sidebar` config (edited from the Sidebar preset group).
 */
export function SessionSidebar({
  project,
  onCollapse,
  activePrompt,
  sessionPrompts = [],
  activeSessionId,
  sessionItems,
  onSelectSession,
  onNewSession,
}: {
  project: AgentFrontendProject;
  onCollapse?: () => void;
  /** The prompt currently shown as the "我" bubble; its session row is highlighted. */
  activePrompt?: string;
  /** Real session prompts supplied by the host. Omitted means there is no history yet. */
  sessionPrompts?: readonly string[];
  /** Identity-based real sessions. When present, these replace the legacy prompt rows. */
  activeSessionId?: string;
  sessionItems?: readonly SessionSidebarItem[];
  /** Click a session to activate its ID (or its prompt for legacy rows). */
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void;
}) {
  const c = useCopy().workspace.sessionSidebar;
  const { locale } = useLocale();
  const { newButton, search, grouping, footer } = project.sidebar;
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchOverlayRoot, setSearchOverlayRoot] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const sessions = onSelectSession
    ? sessionItems ?? sessionPrompts.map((prompt) => ({ id: prompt, title: prompt }))
    : [];
  const hasSessions = sessions.length > 0;
  const footerLabel = c.footerNote.replace("{version}", appVersionLabel);
  // Display-only: when the active prompt does not match, highlight the first supplied
  // session so one conversation always reads as the currently-open one.
  const requestedActiveId = activeSessionId ?? activePrompt;
  const effectiveActive = sessions.some((session) => session.id === requestedActiveId)
    ? requestedActiveId
    : sessions[0]?.id;
  const filteredSessions = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return sessions;
    }
    return sessions.filter((session) => session.title.toLowerCase().includes(value));
  }, [query, sessions]);
  const today = sessions.slice(0, 3);
  const earlier = sessions.slice(3);
  const searchToday = filteredSessions.filter((session) => today.some((entry) => entry.id === session.id));
  const searchEarlier = filteredSessions.filter((session) => earlier.some((entry) => entry.id === session.id));
  const resolveSearchOverlayRoot = () => {
    const frame = sidebarRef.current?.closest<HTMLElement>(".preview-frame") ?? null;
    return frame?.querySelector<HTMLElement>(".preview-stack") ?? frame;
  };
  const closeSearch = () => setSearchOpen(false);
  const searchOverlay = (
    <div className="session-search-overlay" onMouseDown={closeSearch}>
      <div
        className="session-search-popover"
        role="dialog"
        aria-label={c.searchPlaceholder}
        aria-modal="true"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeSearch();
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <label className="session-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="text"
            value={query}
            placeholder={c.searchPlaceholder}
            aria-label={c.searchPlaceholder}
            autoFocus
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <div className="session-search-results">
          <SessionGroup
            label={c.groupToday}
            items={searchToday}
            activeId={effectiveActive}
            onSelect={(id) => {
              onSelectSession?.(id);
              closeSearch();
            }}
          />
          {searchEarlier.length > 0 ? (
            <SessionGroup
              label={c.groupEarlier}
              items={searchEarlier}
              activeId={effectiveActive}
              onSelect={(id) => {
                onSelectSession?.(id);
                closeSearch();
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (searchOpen) {
      setSearchOverlayRoot(resolveSearchOverlayRoot());
    }
  }, [searchOpen]);

  return (
    <aside ref={sidebarRef} className="session-sidebar" data-preview-anchor="sidebar" aria-label={c.ariaLabel}>
      <header className="session-brand">
        <span className="session-brand-name">{c.brandName}</span>
        <span className="session-brand-actions">
          {search ? (
            <div className="session-search-menu">
              <button
                className="session-search-trigger"
                type="button"
                aria-label={c.searchPlaceholder}
                aria-expanded={searchOpen}
                onClick={() => {
                  const nextOpen = !searchOpen;
                  if (nextOpen) {
                    setSearchOverlayRoot(resolveSearchOverlayRoot());
                  }
                  setSearchOpen(nextOpen);
                }}
              >
                <span className="native-rail-icon"><SearchIcon size={15} /></span>
                <span className="legacy-rail-icon"><Search size={15} /></span>
              </button>
              {searchOpen ? (
                typeof document === "undefined" || !searchOverlayRoot
                  ? searchOverlay
                  : createPortal(searchOverlay, searchOverlayRoot)
              ) : null}
            </div>
          ) : null}
          {onCollapse ? (
            <button
              type="button"
              className="rail-icon-btn"
              aria-label={c.collapse}
              onClick={onCollapse}
            >
              <span className="native-rail-icon"><SidebarToggleIcon size={15} /></span>
              <span className="legacy-rail-icon"><PanelLeft size={15} /></span>
            </button>
          ) : null}
        </span>
      </header>

      <div className="session-actions">
        {newButton ? (
          <button className="session-new" type="button" onClick={onNewSession}>
            <NewChatIcon size={15} />
            <span>{c.newSession}</span>
          </button>
        ) : null}
      </div>

      {hasSessions ? (
        <nav className="session-list">
          {grouping ? (
            <>
              <SessionGroup label={c.groupToday} items={today} activeId={effectiveActive} onSelect={onSelectSession} />
              {earlier.length > 0 ? (
                <SessionGroup label={c.groupEarlier} items={earlier} activeId={effectiveActive} onSelect={onSelectSession} />
              ) : null}
            </>
          ) : (
            <SessionGroup items={sessions} activeId={effectiveActive} onSelect={onSelectSession} />
          )}
        </nav>
      ) : null}

      {footer ? <p className="session-footer">{footerLabel}</p> : null}
    </aside>
  );
}

function SearchIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32.922 31.1609L27.206 25.4449C29.4053 22.9065 30.6056 19.699 30.6056 16.3068C30.6056 12.5728 29.1515 9.06238 26.5112 6.422C23.8708 3.78173 20.3603 2.32764 16.6263 2.32764C12.8924 2.32764 9.38189 3.7817 6.74158 6.42204C4.10128 9.06238 2.64722 12.5729 2.64722 16.3068C2.64722 20.0408 4.10128 23.5513 6.74162 26.1916C9.38192 28.8319 12.8924 30.286 16.6264 30.286C19.7113 30.286 22.6431 29.2927 25.0582 27.4588L30.8412 33.2417C31.1285 33.529 31.505 33.6727 31.8816 33.6727C32.2581 33.6727 32.6347 33.529 32.922 33.2417C33.4965 32.6671 33.4965 31.7355 32.922 31.1609ZM5.5899 16.3068C5.5899 10.2213 10.5408 5.27036 16.6263 5.27036C22.7119 5.27036 27.6628 10.2213 27.6628 16.3068C27.6628 22.3923 22.7118 27.3432 16.6263 27.3432C10.5408 27.3432 5.5899 22.3923 5.5899 16.3068Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SidebarToggleIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.3" y="1.3" width="27.4" height="27.4" rx="4.7" stroke="currentColor" strokeWidth="2.6" />
      <rect x="10" y="2" width="2.6" height="27" fill="currentColor" />
    </svg>
  );
}

function NewChatIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={Math.round((size * 33) / 31)}
      viewBox="0 0 31 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14.5283 1.16602C14.9311 1.167 15.3181 1.32338 15.6084 1.60254C15.8856 1.88048 16.042 2.25685 16.042 2.64941C16.042 3.04213 15.8858 3.41928 15.6084 3.69727C15.32 3.97958 14.9319 4.137 14.5283 4.13574H8.5752C8.20402 4.13574 7.8438 4.16084 7.49512 4.2373C7.13512 4.30255 6.78837 4.4061 6.45312 4.54785C6.11477 4.67831 5.79177 4.84543 5.49023 5.04688C5.19163 5.24474 4.91158 5.46955 4.65332 5.71777C4.39838 5.97034 4.16605 6.24527 3.95996 6.53906C3.76077 6.83574 3.58778 7.14927 3.44434 7.47656C3.17373 8.13321 3.03448 8.83666 3.0332 9.54688V18.626C3.03322 18.9858 3.06024 19.3325 3.13672 19.6924C3.21321 20.0388 3.3163 20.3878 3.45801 20.7207C3.73594 21.3949 4.15225 22.0033 4.67969 22.5068C5.20254 23.0196 5.82351 23.4221 6.50488 23.6904C6.83994 23.8321 7.19978 23.9352 7.55957 24.0117C7.91949 24.077 8.27991 24.1152 8.65332 24.1152C9.10834 24.1101 9.54723 24.2859 9.87305 24.6035C10.036 24.7617 10.1671 24.9499 10.2598 25.1572C10.3498 25.362 10.3879 25.5806 10.4014 25.7988L10.4131 27.8955L14.2451 25.1572C15.2238 24.4621 16.3153 24.1152 17.5234 24.1152H22.2686C22.642 24.1152 23.0022 24.077 23.3486 24.0117C23.7083 23.9465 24.0547 23.8457 24.3896 23.7041C24.7226 23.5624 25.0453 23.3956 25.3535 23.2021C25.6504 23.0087 25.934 22.7771 26.1904 22.5342C26.4469 22.2777 26.6781 22.007 26.8828 21.71C27.2907 21.1238 27.572 20.459 27.707 19.7578C27.7835 19.4091 27.8096 19.0621 27.8096 18.7021V14.0088C27.81 13.8137 27.8504 13.6205 27.9277 13.4414C28.0051 13.2624 28.1181 13.1008 28.2598 12.9668C28.4764 12.76 28.748 12.6195 29.042 12.5625C29.3359 12.5055 29.6398 12.5348 29.918 12.6455C30.0979 12.713 30.2645 12.8251 30.4062 12.9668C30.548 13.1008 30.6609 13.2624 30.7383 13.4414C30.8156 13.6205 30.856 13.8137 30.8564 14.0088V18.7021C30.8538 20.3651 30.3473 21.9884 29.4033 23.3574C29.0942 23.818 28.7367 24.2444 28.3369 24.6289C27.9365 25.0146 27.5013 25.3625 27.0381 25.6699C26.5733 25.9774 26.0776 26.2368 25.5596 26.4424C24.5136 26.8646 23.3965 27.0832 22.2686 27.0859H18.5127C17.3181 27.086 16.2244 27.4318 15.248 28.127L10.1699 31.752C9.87101 31.9692 9.51109 32.0862 9.1416 32.0869C8.91658 32.0835 8.69361 32.0399 8.48438 31.957C8.27292 31.8731 8.08075 31.7468 7.91992 31.5859C7.75876 31.4344 7.63182 31.2501 7.54688 31.0459C7.45576 30.8435 7.40765 30.6242 7.40527 30.4023L7.36621 26.9961C6.35406 26.8407 5.37537 26.5137 4.47266 26.0303C4.02423 25.7866 3.59924 25.5022 3.20215 25.1816C2.79973 24.8718 2.42843 24.5235 2.09473 24.1406C1.7621 23.7585 1.4607 23.3499 1.19434 22.9189C0.674521 22.0555 0.313421 21.1058 0.12793 20.1152C0.0407366 19.6237 -0.00186416 19.1252 0 18.626V9.54492C0 8.99367 0.0520703 8.45309 0.15332 7.91309C0.270289 7.37332 0.436663 6.84482 0.643555 6.33203C1.08688 5.31759 1.7194 4.39635 2.50684 3.61816C3.71357 2.43762 5.24381 1.64178 6.90332 1.33203C7.45321 1.21877 8.01377 1.16342 8.5752 1.16602H14.5283ZM24.9854 0C25.378 1.91864e-05 25.7551 0.152551 26.0381 0.424805C26.3209 0.696988 26.4877 1.06774 26.5029 1.45996H26.5049V3.9873H29.1602C29.5534 3.98732 29.9309 4.14382 30.209 4.42188C30.4868 4.69983 30.6425 5.07677 30.6426 5.46973C30.6426 5.86288 30.4869 6.2405 30.209 6.51855C29.9309 6.79661 29.5534 6.95311 29.1602 6.95312H26.5049V9.47949C26.5048 9.88205 26.3451 10.268 26.0605 10.5527C25.7757 10.8376 25.3891 10.998 24.9863 10.998C24.5836 10.998 24.1969 10.8375 23.9121 10.5527C23.6276 10.268 23.4678 9.88202 23.4678 9.47949V6.95312H20.8125C20.4193 6.9531 20.0417 6.7966 19.7637 6.51855C19.4857 6.2405 19.3301 5.86288 19.3301 5.46973C19.3302 5.07677 19.4859 4.69983 19.7637 4.42188C20.0417 4.14382 20.4193 3.98733 20.8125 3.9873H23.4678V1.45996C23.483 1.06771 23.6498 0.696993 23.9326 0.424805C24.2156 0.152534 24.5927 0 24.9854 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SessionGroup({
  label,
  items,
  activeId,
  onSelect,
}: {
  label?: string;
  items: readonly SessionSidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <section className="session-group">
      {label ? <h4>{label}</h4> : null}
      {items.map(({ id, title }) => {
        const active = id === activeId;
        return (
          <div key={id} className="session-item-shell" data-active={active}>
            <span className="session-item-bg" aria-hidden="true" />
            <button
              className="session-item"
              type="button"
              data-active={active}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect?.(id)}
            >
              <span className="session-item-label">{title}</span>
            </button>
          </div>
        );
      })}
    </section>
  );
}
