import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[#162019]">
      <h1 className="text-3xl font-semibold">Điều khoản sử dụng</h1>
      <div className="mt-6 space-y-4 leading-7 text-[#536058]">
        <p>
          Seedsight hỗ trợ người dùng quản lý hồ sơ doanh nghiệp và liên kết
          địa điểm bằng Google Maps Platform. Người dùng chịu trách nhiệm về
          tính chính xác và quyền sử dụng dữ liệu tự nhập vào hệ thống.
        </p>
        <p>
          Việc sử dụng chức năng Google Maps chịu sự điều chỉnh của{" "}
          <a
            className="text-[#164f35] underline"
            href="https://cloud.google.com/maps-platform/terms"
          >
            Điều khoản Google Maps Platform
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
