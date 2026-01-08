import { IsDateString, IsInt, Min } from 'class-validator';

export class TipPoolDto {
  @IsDateString()
  date: string;
  @IsInt()
  @Min(0)
  totalAmount: number;
}
