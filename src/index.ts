import { ICloudBaseConfig } from "@cloudbase/node-sdk";
import { Request, Startup } from "sfa";
import ResponseStruct from "./ResponseStruct";
import tcb = require("@cloudbase/node-sdk");
import Dbhelper from "./Dbhelper";

declare module "sfa" {
  interface Request {
    readonly isBase64Encoded: boolean;
    readonly context: Record<string, unknown>;
    readonly event: Record<string, unknown>;
  }
  interface Response {
    isBase64Encoded: boolean;
  }
}

export { ResponseStruct, Dbhelper };

export default class SfaCloudbase extends Startup {
  constructor(
    event: Record<string, unknown>,
    context: Record<string, unknown>
  ) {
    super(
      new Request()
        .setBody(getBody(event))
        .setMethod(event.httpMethod as string)
        .setHeaders(event.headers as Record<string, string | string[]>)
        .setParams(event.queryStringParameters as Record<string, string>)
        .setPath(event.path as string)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.ctx.req as any).context = context;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.ctx.req as any).event = event;

    this.ctx.res.headers["content-type"] = "application/json";
  }

  async run(): Promise<ResponseStruct> {
    await super.invoke();
    return this.struct;
  }

  get struct(): ResponseStruct {
    return <ResponseStruct>{
      headers: this.ctx.res.headers,
      statusCode: this.ctx.res.status ?? 0,
      isBase64Encoded: this.ctx.res.isBase64Encoded ?? false,
      body: this.ctx.res.body ?? {},
    };
  }

  useCloudbaseApp<T extends this>(config?: ICloudBaseConfig): T {
    this.use(async (ctx, next) => {
      const tcbConfig: ICloudBaseConfig = config || {
        env: process.env.SCF_NAMESPACE,
      };

      const app = tcb.init(tcbConfig);
      const db = app.database();

      ctx.bag("CB_APP", app);
      ctx.bag("CB_DB", db);

      await next();
    });
    return this as T;
  }

  useCloudbaseDbhelper<T extends this>(): T {
    this.use(async (ctx, next) => {
      const dbhelper = new Dbhelper(ctx);
      ctx.bag("CB_DBHELPER", dbhelper);
      await next();
    });
    return this as T;
  }
}

function getBody(event: Record<string, unknown>): unknown {
  const body = event.body;
  const headers = event.headers as Record<string, string | string[]>;
  if (
    body &&
    typeof body == "string" &&
    headers &&
    headers["content-type"]?.includes("application/json")
  ) {
    return <Record<string, unknown>>JSON.parse(body);
  } else {
    return body || {};
  }
}
