import { z } from 'zod';

/** Fixed CSV field identifiers; display order and inclusion are profile preferences. */
export const csvColumns = [
  'profileId',
  'profile',
  'folderPath',
  'title',
  'url',
  'tags',
  'note',
] as const;
export type CsvColumn = (typeof csvColumns)[number];
export const csvColumnHeaders: Record<CsvColumn, string> = {
  profileId: 'Profile ID',
  profile: 'Profile',
  folderPath: 'Folder path',
  title: 'Title',
  url: 'URL',
  tags: 'Tags',
  note: 'Note',
};
export const csvExportColumnsSchema = z
  .array(z.enum(csvColumns))
  .min(1)
  .max(7)
  .refine(
    (columns) =>
      new Set(columns).size === columns.length && columns.includes('url'),
  );
export const exportPreferencesSchema = z
  .object({
    csvColumnOrder: z
      .array(z.enum(csvColumns))
      .length(7)
      .refine((columns) => new Set(columns).size === 7),
    csvEnabledColumns: csvExportColumnsSchema,
  })
  .strict();
export type ExportPreferences = z.infer<typeof exportPreferencesSchema>;
export const defaultExportPreferences: ExportPreferences = {
  csvColumnOrder: [...csvColumns],
  csvEnabledColumns: [...csvColumns],
};

/** Returns the validated enabled fields in the saved order, keeping URL mandatory. */
export function getCsvExportColumns(
  preferences: ExportPreferences = defaultExportPreferences,
): CsvColumn[] {
  const parsed = exportPreferencesSchema.parse(preferences);
  return parsed.csvColumnOrder.filter((column) =>
    parsed.csvEnabledColumns.includes(column),
  );
}
