"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BusinessDetailResponse, UpdateBusinessRequest } from "@/lib/types";
interface BusinessFormProps {
  business?: BusinessDetailResponse;
  isLoading?: boolean;
  onSubmit: (data: UpdateBusinessRequest) => Promise<void>;
  onCancel?: () => void;
}

export function BusinessForm({
  business,
  isLoading = false,
  onSubmit,
  onCancel,
}: BusinessFormProps) {
  const [name, setName] = useState(business?.name || "");
  const [industry, setIndustry] = useState(business?.industry || "");
  const [website, setWebsite] = useState(business?.website || "");
  const [phone, setPhone] = useState(business?.phone || "");
  const [email, setEmail] = useState(business?.email || "");
  const [address, setAddress] = useState(business?.address || "");
  const [description, setDescription] = useState(business?.description || "");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Tên doanh nghiệp là bắt buộc");
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        industry: industry.trim() || null,
        website: website.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lưu doanh nghiệp";
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
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
          Tên doanh nghiệp *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nhập tên doanh nghiệp"
          className={inputClass}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-foreground mb-2">
            Ngành nghề
          </label>
          <input
            id="industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Ví dụ: F&B, bán lẻ"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-foreground mb-2">
            Website
          </label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
            Số điện thoại
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Số điện thoại"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email liên hệ"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
          Địa chỉ
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Địa chỉ doanh nghiệp"
          className={inputClass}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
          Mô tả
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả doanh nghiệp (không bắt buộc)"
          rows={4}
          className={inputClass}
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Đang lưu..." : business ? "Cập nhật doanh nghiệp" : "Tạo doanh nghiệp"}
        </Button>
      </div>
    </form>
  );
}
