"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { PRESETS, type AlarmPreset } from "@/lib/presets";

const PLACEHOLDER = "— เลือก preset —";

/** ไม่แสดงระดับที่คาดไว้ (expected) เพราะผลจริงขึ้นกับการวิเคราะห์ของ AI */
function PresetLabel({ p }: { p: AlarmPreset }) {
  return (
    <>
      <span className="truncate">
        {p.point_type} · {p.point}
      </span>
    </>
  );
}

/**
 * Dropdown เลือก preset (listbox ทำเอง ให้หน้าตาเข้ากับฟอร์ม รองรับคีย์บอร์ดครบ)
 * value / onChange เป็น index ของ PRESETS แบบ string ("" = ยังไม่เลือก)
 */
export function PresetSelect({
  value,
  onChange,
  labelId,
}: {
  value: string;
  onChange: (idx: string) => void;
  labelId: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = value === "" ? null : PRESETS[Number(value)] ?? null;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  // ปิดเมื่อคลิกนอก dropdown
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // เลื่อนรายการที่ไฮไลต์ให้อยู่ในมุมมอง
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const openList = () => {
    setActive(value === "" ? 0 : Number(value));
    setOpen(true);
    requestAnimationFrame(() => listRef.current?.focus());
  };

  const choose = (i: number) => {
    onChange(String(i));
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = PRESETS.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(a + 1, last));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative w-full min-w-0 sm:w-80 xl:w-72 2xl:w-80">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${listId}-value`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKey}
        className="flex h-8 w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-2 text-left font-mono text-[12px] text-slate-900"
      >
        <span id={`${listId}-value`} className="flex min-w-0 flex-1 items-center gap-2">
          {selected ? <PresetLabel p={selected} /> : <span className="truncate text-slate-500">{PLACEHOLDER}</span>}
        </span>
        <ChevronDown aria-hidden className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={optionId(active)}
          onKeyDown={onListKey}
          className="absolute right-0 z-30 mt-1 max-h-72 w-full min-w-[18rem] overflow-auto rounded-md border border-slate-200 bg-white py-1 font-mono text-[12px] text-slate-900 shadow-lg outline-none"
        >
          {PRESETS.map((p, i) => (
            <li
              key={i}
              id={optionId(i)}
              role="option"
              aria-selected={String(i) === value}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(i)}
              className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${i === active ? "bg-slate-100" : ""} ${
                String(i) === value ? "font-semibold" : ""
              }`}
            >
              <PresetLabel p={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
