"use client";

import { useEffect, useRef } from "react";
import grapesjs from "grapesjs";
import type { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap";

const FALLBACK_TITLE = "صفحة المنتج";

/** Fallback height when the measured container height is not available yet. */
const FALLBACK_HEIGHT = 560;

export interface GrapesjsEditorProps {
  /** Full standalone `generatedCode` HTML document. */
  initialHtml: string;
  /** Serialized full document, fired on edits (debounced ~600ms). */
  onHtmlChange: (fullHtml: string) => void;
}

interface ParsedDocument {
  css: string;
  bodyHtml: string;
  /** `<head>` inner HTML with all `<style>` blocks removed. */
  headWithoutStyle: string;
  lang: string;
  dir: string;
  /** Original `:root { … }` block, kept to restore CSS vars if grapesjs drops them. */
  rootVars: string;
}

/**
 * Parse the standalone HTML document into the pieces grapesjs needs
 * (CSS + body markup) plus the metadata required to reassemble it later.
 */
function parseDocument(html: string): ParsedDocument {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const htmlEl = doc.documentElement;
  const lang = htmlEl.getAttribute("lang") || "ar";
  const dir = htmlEl.getAttribute("dir") || "rtl";

  const css = Array.from(doc.querySelectorAll("style"))
    .map((el) => el.textContent || "")
    .join("\n");

  const head = doc.head.cloneNode(true) as HTMLElement;
  head.querySelectorAll("style").forEach((el) => el.remove());
  const headWithoutStyle = head.innerHTML.trim();

  const rootMatch = css.match(/:root\s*\{[^{}]*\}/);
  const rootVars = rootMatch ? rootMatch[0] : "";

  return {
    css,
    bodyHtml: doc.body.innerHTML,
    headWithoutStyle,
    lang,
    dir,
    rootVars,
  };
}

/**
 * grapesjs may strip the `id` attribute when a component is re-serialized.
 * The checkout form is addressed via `#checkout-form` from the sticky CTA and
 * hero anchor links, so restore the id on the form with the `checkout-form`
 * class (or any form) if it is missing.
 */
function ensureCheckoutFormId(bodyHtml: string): string {
  if (bodyHtml.includes('id="checkout-form"')) return bodyHtml;

  if (bodyHtml.includes("checkout-form")) {
    // Prefer adding the id to the form that carries the `checkout-form` class.
    return bodyHtml.replace(
      /<form\b(?![^>]*\bid\s*=)/i,
      '<form id="checkout-form"',
    );
  }

  if (/<form\b/i.test(bodyHtml) && !/<form\b[^>]*\bid\s*=/i.test(bodyHtml)) {
    return bodyHtml.replace(/<form\b/i, '<form id="checkout-form"');
  }

  return bodyHtml;
}

function reassembleDocument(
  parsed: ParsedDocument,
  bodyHtml: string,
  css: string,
): string {
  const { headWithoutStyle, lang, dir, rootVars } = parsed;

  // grapesjs can drop the `:root` custom properties; put them back verbatim.
  let finalCss = css;
  if (rootVars && !finalCss.includes("--lp-primary")) {
    finalCss = `${rootVars}\n${finalCss}`;
  }

  // Ensure the document stays RTL even if the `body` rule was lost.
  if (!/body\s*\{[^{}]*direction\s*:/i.test(finalCss)) {
    finalCss = `body { direction: ${dir}; }\n${finalCss}`;
  }

  const body = ensureCheckoutFormId(bodyHtml);

  const title = headWithoutStyle.includes("<title")
    ? ""
    : `<title>${FALLBACK_TITLE}</title>`;

  return (
    "<!doctype html>\n" +
    `<html lang="${lang}" dir="${dir}">\n` +
    "<head>\n" +
    headWithoutStyle +
    title +
    `\n<style>\n${finalCss}\n</style>\n` +
    "</head>\n" +
    `<body>${body}</body>\n` +
    "</html>"
  );
}

/**
 * GrapesJS WYSIWYG editor for the landing-page `generatedCode` document.
 *
 * Only runs in the browser: it is imported via `next/dynamic({ ssr: false })`
 * in `editor-parts.tsx`. We use the raw `grapesjs.init()` API (rather than the
 * `@grapesjs/react` wrapper) for predictable load/save control.
 */
export default function GrapesjsEditor({
  initialHtml,
  onHtmlChange,
}: GrapesjsEditorProps) {
  // `wrapperRef` fills the parent (which must have a definite height); we
  // measure it to give grapesjs a concrete pixel height. grapesjs writes its
  // `height` config as an inline style on the container, which would override
  // any `h-[...]` class and collapse against an auto-height parent if we passed
  // a percentage like "100%".
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onHtmlChangeRef = useRef(onHtmlChange);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mount-time snapshot. Never updated on subsequent renders, so the editor's
  // own `onHtmlChange` round-trip does not re-trigger initialization.
  const initialHtmlRef = useRef(initialHtml);

  // Keep the latest callback without tearing down/re-creating the editor.
  useEffect(() => {
    onHtmlChangeRef.current = onHtmlChange;
  }, [onHtmlChange]);

  // Initialize exactly once per mount. The editor becomes the source of truth;
  // subsequent `initialHtml` changes (the parent mirroring our own edits) must
  // not destroy/recreate the editor.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    if (!wrapper || !container) return;

    const parsed = parseDocument(initialHtmlRef.current);

    const measureHeight = () => {
      const h = wrapper.clientHeight;
      return h > 0 ? h : FALLBACK_HEIGHT;
    };

    const editor: Editor = grapesjs.init({
      container,
      // A definite pixel height (not "100%") so `.gjs-editor`/`.gjs-cv-canvas`
      // resolve to a non-zero offsetHeight even if the wrapper is still settling.
      height: `${measureHeight()}px`,
      width: "100%",
      storageManager: false,
      fromElement: false,
      noticeOnUnload: false,
      canvas: {
        // Load Arabic fonts inside the canvas iframe.
        styles: [GOOGLE_FONTS_URL],
        // Keep the canvas rendering right-to-left.
        frameStyle: `body { direction: ${parsed.dir}; }`,
      },
    });

    editor.setStyle(parsed.css);
    editor.setComponents(parsed.bodyHtml);

    // Keep the editor height glued to the wrapper's layout height (window
    // resize, view toggling, etc.). `.gjs-editor` is 100% of the container, so
    // updating the container's inline height resizes the canvas automatically.
    const resizeObserver = new ResizeObserver(() => {
      const h = measureHeight();
      container.style.height = `${h}px`;
      editor.refresh();
    });
    resizeObserver.observe(wrapper);

    const serialize = (): string | null => {
      try {
        const body = editor.getHtml();
        const css = editor.getCss({ keepUnusedStyles: true }) || "";
        return reassembleDocument(parsed, body, css);
      } catch {
        return null;
      }
    };

    const flush = () => {
      dirtyRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const html = serialize();
      if (html !== null) onHtmlChangeRef.current(html);
    };

    // grapesjs emits the `update` event via a debounced `setTimeout`, so the
    // initial `setStyle`/`setComponents` still fire it asynchronously after we
    // attach the listener. Ignore those load-time updates so merely opening the
    // tab does not trigger a normalization round-trip.
    let ready = false;
    const handleUpdate = () => {
      if (!ready) return;
      dirtyRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 600);
    };

    editor.on("update", handleUpdate);

    const readyTimer = setTimeout(() => {
      ready = true;
    }, 300);

    return () => {
      clearTimeout(readyTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      resizeObserver.disconnect();
      // Flush uncommitted edits before destroying so nothing is lost when the
      // tab unmounts (the TabsContent here unmounts inactive panels).
      if (dirtyRef.current) {
        const html = serialize();
        if (html !== null) onHtmlChangeRef.current(html);
      }
      editor.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
