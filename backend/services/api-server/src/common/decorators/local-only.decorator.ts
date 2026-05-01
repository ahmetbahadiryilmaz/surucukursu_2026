import { SetMetadata } from '@nestjs/common';

export const IS_LOCAL_ONLY_KEY = 'isLocalOnly';
export const LocalOnly = () => SetMetadata(IS_LOCAL_ONLY_KEY, true);