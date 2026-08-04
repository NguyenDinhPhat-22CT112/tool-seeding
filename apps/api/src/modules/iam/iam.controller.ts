import { Controller, Get } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type {
  IamBootstrapResponse,
  IamMeResponse,
} from "@seeding/contracts";
import { ApiErrorResponseDto } from "../../common";
import { Ctx, RequestContext } from "../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../shared/swagger/temporary-auth.decorator";
import { IamService } from "./iam.service";

@ApiTags("IAM")
@Controller("iam")
export class IamController {
  constructor(private readonly service: IamService) {}

  @Get("bootstrap")
  @ApiOperation({
    summary: "Danh sách org + user để chọn (auth stub)",
    description:
      "Endpoint CÔNG KHAI (không cần header auth). Frontend dùng để render " +
      "màn hình chọn org/user/role trước khi gửi 3 header tạm thời.",
  })
  @ApiOkResponse({ description: "Danh sách organizations kèm members" })
  bootstrap(): Promise<IamBootstrapResponse> {
    return this.service.bootstrap();
  }

  @Get("me")
  @ApiTemporaryAuth()
  @ApiOperation({ summary: "Thông tin người dùng hiện tại theo headers" })
  @ApiOkResponse({ description: "Org + user tương ứng với 3 header đã gửi" })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  me(@Ctx() ctx: RequestContext): Promise<IamMeResponse> {
    return this.service.me(ctx);
  }
}
