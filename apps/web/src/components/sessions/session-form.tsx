"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BusinessListItemResponse } from "@/lib/types";

interface SessionFormProps {
  session?: {
    businessId?: string;
    name?: string;
    objective?: string | null;
    focusProduct?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  };
  onSubmit: (data: {
    businessId?: string;
    name: string;
    objective?: string | null;
    focusProduct?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  }) => Promise<void>;
  isLoading?: boolean;
  businesses?: BusinessListItemResponse[];
}

export function SessionForm({
  session,
  onSubmit,
  isLoading,
  businesses = [],
}: SessionFormProps) {
  const [formData, setFormData] = useState({
    businessId: session?.businessId || "",
    name: session?.name || "",
    objective: session?.objective || "",
    focusProduct: session?.focusProduct || "",
    dateFrom: session?.dateFrom ? session.dateFrom.split("T")[0] : "",
    dateTo: session?.dateTo ? session.dateTo.split("T")[0] : "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Tên đợt phân tích là bắt buộc");
      return;
    }

    try {
      await onSubmit({
        businessId: formData.businessId || undefined,
        name: formData.name.trim(),
        objective: formData.objective.trim() || null,
        focusProduct: formData.focusProduct.trim() || null,
        dateFrom: formData.dateFrom || null,
        dateTo: formData.dateTo || null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lưu đợt phân tích";
      setError(message);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-4"
    >
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!session && businesses.length > 0 && (
        <div>
          <label htmlFor="session-business" className="block text-sm font-medium text-foreground mb-1.5">
            Doanh nghiệp *
          </label>
          <select
            id="session-business"
            value={formData.businessId}
            onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
            required
            className={inputClass}
          >
            <option value="">Chọn doanh nghiệp</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="session-name" className="block text-sm font-medium text-foreground mb-1.5">
          Tên đợt phân tích *
        </label>
        <input
          id="session-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ví dụ: Phân tích thị trường quý 4"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="session-objective" className="block text-sm font-medium text-foreground mb-1.5">
          Mục tiêu
        </label>
        <textarea
          id="session-objective"
          value={formData.objective}
          onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
          placeholder="Mục tiêu của đợt phân tích này là gì?"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label htmlFor="session-product" className="block text-sm font-medium text-foreground mb-1.5">
          Sản phẩm trọng tâm
        </label>
        <input
          id="session-product"
          type="text"
          value={formData.focusProduct}
          onChange={(e) => setFormData({ ...formData, focusProduct: e.target.value })}
          placeholder="Ví dụ: Sản phẩm X"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="session-date-from" className="block text-sm font-medium text-foreground mb-1.5">
            Từ ngày
          </label>
          <input
            id="session-date-from"
            type="date"
            value={formData.dateFrom}
            onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="session-date-to" className="block text-sm font-medium text-foreground mb-1.5">
            Đến ngày
          </label>
          <input
            id="session-date-to"
            type="date"
            value={formData.dateTo}
            onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Đang lưu..." : "Lưu đợt phân tích"}
        </Button>
      </div>
    </form>
  );
}
