import { Module } from '@nestjs/common'
import { validateEnv } from './env.service'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: `.env.${process.env.NODE_ENV}`
    })
  ]
})
export class EnvModule {}
