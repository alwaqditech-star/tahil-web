"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}

function ModalShell({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useBodyScrollLock(open);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="w-full flex justify-center" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; wide?: boolean;
}) {
  return (
    <ModalShell open={open} onClose={onClose}>
      <div className={cn(
        "glass-card w-full max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto p-5 sm:p-6 border-white/10",
        wide ? "max-w-2xl" : "max-w-lg",
      )}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </ModalShell>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, message, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  message: string; loading?: boolean;
}) {
  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="glass-card max-w-md w-full p-6">
        <p className="text-white mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn variant="danger" onClick={onConfirm} loading={loading}>حذف</Btn>
        </div>
      </div>
    </ModalShell>
  );
}

export function Btn({ children, onClick, onMouseDown, type = "button", variant = "primary", loading, className, disabled }: {
  children: React.ReactNode; onClick?: () => void; onMouseDown?: (e: React.MouseEvent) => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  loading?: boolean; className?: string; disabled?: boolean;
}) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500 border border-blue-500/50 shadow-sm",
    secondary: "bg-white/8 text-slate-200 border border-white/12 hover:bg-white/12",
    danger: "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/40",
    ghost: "bg-white/5 text-slate-300 hover:bg-white/10",
    success: "bg-emerald-600/90 text-white border border-emerald-500/50 hover:bg-emerald-500",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled || loading}
      className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 inline-flex items-center gap-2", variants[variant], className)}
    >
      {loading && <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-rose-400 mr-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

/** حقول رقمية — تسمح بمسح الصفر وإعادة الكتابة */
export function NumberInput({
  value,
  onChange,
  emptyZero = true,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (value: number) => void;
  emptyZero?: boolean;
}) {
  const shown = emptyZero && value === 0 ? "" : value;
  return (
    <Input
      type="number"
      inputMode="decimal"
      {...props}
      value={shown}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? 0 : Number(raw));
      }}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        inputClass,
        "erp-select cursor-pointer appearance-none bg-[length:1rem] bg-[position:left_0.75rem_center] bg-no-repeat pr-3 pl-9",
        "bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2394a3b8%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')]",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "resize-none", props.className)} />;
}

export function FormActions({ onCancel, loading }: { onCancel: () => void; loading?: boolean }) {
  return (
    <div className="flex gap-3 justify-end pt-4 border-t border-white/5 mt-4">
      <Btn variant="ghost" onClick={onCancel} type="button">إلغاء</Btn>
      <Btn type="submit" loading={loading}>حفظ</Btn>
    </div>
  );
}

export function RowActions({ onEdit, onDelete, onApprove, onReject, showApprove }: {
  onEdit?: () => void; onDelete?: () => void;
  onApprove?: () => void; onReject?: () => void; showApprove?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {showApprove && onApprove && <Btn variant="success" onClick={onApprove} className="!px-2 !py-1 text-xs">اعتماد</Btn>}
      {showApprove && onReject && <Btn variant="danger" onClick={onReject} className="!px-2 !py-1 text-xs">رفض</Btn>}
      {onEdit && <Btn variant="secondary" onClick={onEdit} className="!px-2 !py-1 text-xs">تعديل</Btn>}
      {onDelete && <Btn variant="danger" onClick={onDelete} className="!px-2 !py-1 text-xs">حذف</Btn>}
    </div>
  );
}

export function PageToolbar({ onAdd, addLabel = "إضافة جديد" }: { onAdd?: () => void; addLabel?: string }) {
  if (!onAdd) return null;
  return (
    <div className="mb-6 flex justify-end">
      <Btn onClick={onAdd}>+ {addLabel}</Btn>
    </div>
  );
}
