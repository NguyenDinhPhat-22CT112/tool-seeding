"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BusinessLocationResponse, CreateBusinessLocationRequest } from "@/lib/types";

interface LocationFormProps {
  location?: BusinessLocationResponse;
  isLoading?: boolean;
  onSubmit: (data: CreateBusinessLocationRequest) => Promise<void>;
  onCancel?: () => void;
}

export function LocationForm({
  location,
  isLoading = false,
  onSubmit,
  onCancel,
}: LocationFormProps) {
  const [name, setName] = useState(location?.name || "");
  const [address, setAddress] = useState(location?.address || "");
  const [phone, setPhone] = useState(location?.phone || "");
  const [website, setWebsite] = useState(location?.website || "");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Tên cơ sở là bắt buộc");
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lưu cơ sở";
      setError(message);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-background border border-muted-foreground/20 rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

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

      <div>
        <label htmlFor="location-name" className="block text-sm font-medium text-foreground mb-2">
          Tên cơ sở *
        </label>
        <input
          id="location-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Chi nhánh 1 - Hai Bà Trưng"
          className={inputClass}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="location-address" className="block text-sm font-medium text-foreground mb-2">
          Địa chỉ
        </label>
        <input
          id="location-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Địa chỉ cơ sở"
          className={inputClass}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="location-phone" className="block text-sm font-medium text-foreground mb-2">
            Số điện thoại
          </label>
          <input
            id="location-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Số điện thoại"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="location-website" className="block text-sm font-medium text-foreground mb-2">
            Website
          </label>
          <input
            id="location-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
            className={inputClass}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Đang lưu..." : location ? "Cập nhật cơ sở" : "Thêm cơ sở"}
        </Button>
      </div>
    </form>
  );
}
