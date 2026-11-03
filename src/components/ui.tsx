"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { imageOptions } from "@/lib/seed";
export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
}
export function Empty({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </div>
  );
}
export function Feedback({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return error ? (
    <p role="alert" className="feedback error">
      {error}
    </p>
  ) : message ? (
    <p role="status" className="feedback success">
      {message}
    </p>
  ) : null;
}
export function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      Image
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {value.startsWith("data:") || value.startsWith("/api/media/") ? (
          <option value={value}>Your uploaded photo</option>
        ) : null}
        {imageOptions.map((i) => (
          <option key={i.src} value={i.src}>
            {i.label}
          </option>
        ))}
      </select>
      <Image
        className="image-picker-preview"
        src={value || imageOptions[0].src}
        alt=""
        width={180}
        height={210}
        unoptimized
      />
    </label>
  );
}
export function CheckList({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { id: string; title: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="check-list">
      <legend>{label}</legend>
      {items.map((item) => (
        <label className="check" key={item.id}>
          <input
            type="checkbox"
            checked={value.includes(item.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...value, item.id]
                  : value.filter((id) => id !== item.id),
              )
            }
          />
          {item.title}
        </label>
      ))}
    </fieldset>
  );
}
