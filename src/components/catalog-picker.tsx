"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, Input, Select } from "@/components/crud/ui";
import { api, type CatalogItem } from "@/lib/api";

type CatalogPickerProps = {
  token: string;
  value: number | "";
  onChange: (item: CatalogItem | null) => void;
  label?: string;
  required?: boolean;
};

export function CatalogPicker({ token, value, onChange, label = "اختر من دليل البنود", required }: CatalogPickerProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.catalogItems(token).list({ active: true }).then(setItems).catch(() => {});
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.code?.toLowerCase().includes(q)) ||
      (i.category?.toLowerCase().includes(q))
    );
  }, [items, search]);

  const handleSelect = (id: string) => {
    if (!id) { onChange(null); return; }
    const item = items.find((i) => i.id === Number(id)) ?? null;
    onChange(item);
  };

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-slate-800/30 p-4">
      <Field label={label} required={required}>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في الدليل..."
        />
      </Field>
      <Select value={value === "" ? "" : String(value)} onChange={(e) => handleSelect(e.target.value)}>
        <option value="">— اختر بنداً من الدليل —</option>
        {filtered.map((i) => (
          <option key={i.id} value={i.id}>
            {i.code ? `[${i.code}] ` : ""}{i.name} — {i.unit}
          </option>
        ))}
      </Select>
      {items.length === 0 && (
        <p className="text-xs text-slate-500">الدليل فارغ — أضف بنوداً من صفحة «دليل البنود»</p>
      )}
    </div>
  );
}
