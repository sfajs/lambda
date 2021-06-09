import { Database } from "@cloudbase/node-sdk";
import { HttpContext } from "sfa";

export default class Dbhelper {
  constructor(readonly ctx: HttpContext) {}

  async getScalar(
    collection: Database.CollectionReference,
    doc: string,
    field: string
  ): Promise<unknown | undefined> {
    const fieldObj: Record<string, unknown> = {};
    fieldObj[field] = true;

    const res = await collection.doc(doc).field(fieldObj).get();
    if (!res.data || !res.data.length) return;
    return res.data[0][field];
  }

  async updateScalar(
    collection: Database.CollectionReference,
    doc: string,
    field: string,
    value: unknown
  ): Promise<number | undefined> {
    const fieldObj: Record<string, unknown> = {};
    fieldObj[field] = value;

    const res = await collection.doc(doc).update(fieldObj);
    return res.updated;
  }

  /**
   * @param request data: { page, limit }
   * @param partQuery part of query, like where(...)
   */
  async getPageList(
    partQuery: Database.Query | Database.CollectionReference
  ): Promise<{ list: unknown[]; total: number | undefined }> {
    const { page, limit } = this.pageQuery;
    const countRes = await partQuery.count();
    const listRes = await partQuery
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    return {
      list: listRes.data,
      total: countRes.total,
    };
  }

  private get pageQuery(): { page: number; limit: number } {
    let page: number | undefined;
    let limit: number | undefined;

    const request = this.ctx.req;
    if (request.params && request.params.page != undefined) {
      page = Number(request.params.page);
    } else if (request.body && request.body.page != undefined) {
      page = Number(request.body.page);
    }

    if (request.params && request.params.limit != undefined) {
      limit = Number(request.params.limit);
    } else if (request.params && request.params.pageSize != undefined) {
      limit = Number(request.params.pageSize);
    } else if (request.body && request.body.limit != undefined) {
      limit = Number(request.body.limit);
    } else if (request.body && request.body.pageSize != undefined) {
      limit = Number(request.body.pageSize);
    }

    if (!page) page = 1;
    if (!limit) limit = 20;

    return {
      page: page,
      limit: limit,
    };
  }
}
