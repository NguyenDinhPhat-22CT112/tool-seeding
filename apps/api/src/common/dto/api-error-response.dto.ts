import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ApiErrorResponse } from "@seeding/contracts";

export class ApiErrorResponseDto implements ApiErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiPropertyOptional({ example: "SERPAPI_QUOTA_EXCEEDED" })
  code?: string;

  @ApiProperty({
    oneOf: [
      { type: "string", example: "Dữ liệu không hợp lệ" },
      {
        type: "array",
        items: { type: "string" },
        example: ["name không được để trống"],
      },
    ],
  })
  message!: string | string[];

  @ApiProperty({ example: "Bad Request" })
  error!: string;

  @ApiProperty({ format: "date-time" })
  timestamp!: string;

  @ApiProperty({ example: "/api/businesses" })
  path!: string;

  @ApiPropertyOptional({ description: "Mã dùng để đối chiếu log phía server" })
  requestId?: string;
}
