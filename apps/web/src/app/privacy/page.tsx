import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[#162019]">
      <h1 className="text-3xl font-semibold">Chính sách riêng tư</h1>
      <div className="mt-6 space-y-4 leading-7 text-[#536058]">
        <p>
          Seedsight lưu hồ sơ do người dùng nhập và Google Place ID để duy trì
          liên kết địa điểm. Nội dung xem trước từ Google Places không được lưu
          vào cache hoặc tự động sao chép vào hồ sơ nghiệp vụ.
        </p>
        <p>
          Google xử lý dữ liệu theo{" "}
          <a
            className="text-[#164f35] underline"
            href="https://policies.google.com/privacy"
          >
            Chính sách quyền riêng tư của Google
          </a>
          .
        </p>
        <Link className="inline-block text-[#164f35] underline" href="/">
          Quay lại Seedsight
        </Link>
      </div>
    </main>
  );
}
