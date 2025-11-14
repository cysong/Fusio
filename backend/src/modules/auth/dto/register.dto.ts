import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(32, { message: 'Password must not exceed 32 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase letters and numbers',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nickname must be at least 2 characters' })
  @MaxLength(50, { message: 'Nickname must not exceed 50 characters' })
  nickname?: string;
}
