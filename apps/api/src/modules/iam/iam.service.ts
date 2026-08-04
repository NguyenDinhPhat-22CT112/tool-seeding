import { Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import type {
  IamBootstrapResponse,
  IamMeResponse,
} from "@seeding/contracts";
import type { RequestContext } from "../../shared/context/request-context";

/**
 * Giai đoạn 1: auth STUB — chưa có JWT/login thật.
 * Hai endpoint này đọc thẳng DB để frontend render màn hình
 * "chọn org + user + role" rồi gửi dưới dạng 3 header tạm thời.
 * Khi Auth thật hoàn thành, `bootstrap` sẽ bị xóa và `me` trả về
 * từ token đã giải mã — không cần sửa frontend ở tầng gọi API.
 */
@Injectable()
export class IamService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(): Promise<IamBootstrapResponse> {
    const organizations = await this.prisma.organization.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        members: {
          where: { isActive: true },
          include: { user: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        members: org.members.map((m) => ({
          userId: m.user.id,
          email: m.user.email,
          fullName: m.user.fullName,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
        })),
      })),
    };
  }

  async me(ctx: RequestContext): Promise<IamMeResponse> {
    const [organization, user] = await Promise.all([
      this.prisma.organization.findFirst({
        where: { id: ctx.organizationId, deletedAt: null },
      }),
      this.prisma.user.findFirst({
        where: { id: ctx.userId, deletedAt: null },
      }),
    ]);

    return {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      role: ctx.role,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          }
        : null,
      user: user
        ? {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
          }
        : null,
    };
  }
}
