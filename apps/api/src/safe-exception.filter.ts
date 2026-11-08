import {Catch,HttpException,type ExceptionFilter,type ArgumentsHost} from '@nestjs/common';
import type {Response} from 'express';
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {catch(exception:unknown,host:ArgumentsHost){const response=host.switchToHttp().getResponse<Response>();const requestId=response.getHeader('X-Request-ID');if(exception instanceof HttpException){response.status(exception.getStatus()).json(exception.getResponse());return;}const code=exception&&typeof exception==='object'&&'code' in exception&&/^P\d{4}$/.test(String(exception.code))?String(exception.code):'UNEXPECTED';console.error(JSON.stringify({event:'http_error',requestId,code,status:500}));response.status(500).json({message:'Service temporarily unavailable',requestId});}}
