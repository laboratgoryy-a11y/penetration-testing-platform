import { Pool } from 'pg';

export interface ResolvedReportArtifact {
  reportId: string;
  fileName: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number | null;
}

export async function findLatestReportArtifactForEntity(
  db: Pool,
  userId: string,
  entityId: string,
  entityType?: string
): Promise<ResolvedReportArtifact | null> {
  const useEntityType = typeof entityType === 'string' && entityType.trim().length > 0;
  const params = useEntityType
    ? [entityId, userId, entityType]
    : [entityId, userId];

  const result = await db.query<{
    report_id: string;
    file_name: string;
    object_key: string;
    content_type: string;
    size_bytes: number | null;
  }>(
    `SELECT r.id AS report_id,
            a.file_name,
            a.object_key,
            a.content_type,
            a.size_bytes
     FROM reports r
     INNER JOIN job_artifacts a
       ON a.id = r.artifact_id
     WHERE r.generated_by = $2
       AND r.status = 'ready'
       AND (
         r.metadata->>'entityId' = $1
         OR r.metadata->>'sourceJobId' = $1
         OR r.metadata->>'scanId' = $1
       )
       ${
         useEntityType
           ? `AND (
                r.metadata->>'entityType' = $3
                OR r.metadata->>'entityType' IS NULL
              )`
           : ''
       }
     ORDER BY r.generated_at DESC
     LIMIT 1`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    reportId: result.rows[0].report_id,
    fileName: result.rows[0].file_name,
    objectKey: result.rows[0].object_key,
    contentType: result.rows[0].content_type,
    sizeBytes: result.rows[0].size_bytes,
  };
}
