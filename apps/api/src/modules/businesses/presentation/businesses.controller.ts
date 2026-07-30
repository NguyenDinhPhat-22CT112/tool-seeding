import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Ctx, RequestContext } from "../../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../../shared/swagger/temporary-auth.decorator";
import { ResourceIdPipe } from "../../../shared/validation/resource-id.pipe";
import { ApiErrorResponseDto } from "../../../common";
import { BusinessService } from "../application/business.service";
import {
  CreateBusinessDto,
  ListBusinessesQueryDto,
  UpdateBusinessDto,
} from "../application/business.dto";
import {
  BusinessDetailResponse,
  BusinessListResponse,
  DeactivateBusinessResponse,
} from "../application/business.mapper";

@ApiTags("Businesses")
@ApiTemporaryAuth()
@Controller("businesses")
export class BusinessesController {
  constructor(private readonly service: BusinessService) {}

  @Get()
  @ApiOperation({
    summary: "Danh sách doanh nghiệp trong organization hiện tại",
  })
  @ApiOkResponse({ type: BusinessListResponse })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Tham số lọc hoặc phân trang không hợp lệ",
  })
  list(@Ctx() ctx: RequestContext, @Query() query: ListBusinessesQueryDto) {
    return this.service.list(ctx, query);
  }

  @Post()
  @ApiOperation({ summary: "Tạo doanh nghiệp" })
  @ApiCreatedResponse({ type: BusinessDetailResponse })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Chỉ Organization Admin được tạo doanh nghiệp",
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  create(@Ctx() ctx: RequestContext, @Body() dto: CreateBusinessDto) {
    return this.service.create(ctx, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết doanh nghiệp" })
  @ApiOkResponse({ type: BusinessDetailResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy doanh nghiệp trong organization hiện tại",
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  getDetail(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.getDetail(ctx, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật hồ sơ doanh nghiệp đang hoạt động" })
  @ApiOkResponse({ type: BusinessDetailResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy doanh nghiệp trong organization hiện tại",
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Không có quyền cập nhật doanh nghiệp",
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Doanh nghiệp không ở trạng thái cho phép cập nhật",
  })
  update(
    @Ctx() ctx: RequestContext,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.service.update(ctx, id, dto);
  }

  @Post(":id/deactivate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Ngừng hoạt động doanh nghiệp",
    description:
      "Tự động archive session DRAFT. Từ chối nếu còn session non-terminal khác.",
  })
  @ApiOkResponse({ type: DeactivateBusinessResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy doanh nghiệp trong organization hiện tại",
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Chỉ Organization Admin được ngừng hoạt động",
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Doanh nghiệp còn session chưa kết thúc",
  })
  deactivate(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.deactivate(ctx, id);
  }

  /** Giữ tương thích với client cũ; endpoint rõ nghĩa ở trên được ưu tiên. */
  @Delete(":id")
  @ApiOperation({
    summary: "Ngừng hoạt động doanh nghiệp (deprecated)",
    deprecated: true,
  })
  @ApiOkResponse({ type: DeactivateBusinessResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy doanh nghiệp trong organization hiện tại",
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Chỉ Organization Admin được ngừng hoạt động",
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "ID không hợp lệ hoặc doanh nghiệp còn session chưa kết thúc",
  })
  deactivateLegacy(
    @Ctx() ctx: RequestContext,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.deactivate(ctx, id);
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Khôi phục doanh nghiệp đã ngừng hoạt động" })
  @ApiOkResponse({ type: BusinessDetailResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy doanh nghiệp trong organization hiện tại",
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Chỉ Organization Admin được khôi phục",
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Doanh nghiệp đang hoạt động, không cần khôi phục",
  })
  restore(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.restore(ctx, id);
  }
}
