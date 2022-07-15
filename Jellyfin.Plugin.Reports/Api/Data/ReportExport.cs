#nullable disable

using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using Jellyfin.Plugin.Reports.Api.Model;

namespace Jellyfin.Plugin.Reports.Api.Data
{
    /// <summary> A report export. </summary>
    public static class ReportExport
	{
		/// <summary> Export to CSV. </summary>
		/// <param name="reportResult"> The report result. </param>
		/// <returns> A MemoryStream containing a CSV file. </returns>
		public static MemoryStream ExportToCsv(ReportResult reportResult)
		{
			static void AppendRows(StringBuilder builder, List<ReportRow> rows)
			{
				foreach (ReportRow row in rows)
				{
					builder.AppendJoin(';', row.Columns.Select(s => s.Name.Replace(',', ' '))).AppendLine();
				}
			}

			StringBuilder returnValue = new StringBuilder();
			returnValue.AppendJoin(';', reportResult.Headers.Select(s => s.Name.Replace(',', ' '))).AppendLine();

			if (reportResult.IsGrouped)
			{
				foreach (ReportGroup group in reportResult.Groups)
				{
					AppendRows(returnValue, group.Rows);
				}
			}
			else
			{
				AppendRows(returnValue, reportResult.Rows);
			}

            MemoryStream memoryStream = new MemoryStream();
            StreamWriter writer = new StreamWriter(memoryStream);
            writer.Write(returnValue.ToString());
            writer.Flush();
            memoryStream.Position = 0;
            return memoryStream;
        }


		/// <summary> Export to Excel. </summary>
		/// <param name="reportResult"> The report result. </param>
		/// <returns> A MemoryStream containing a XLSX file. </returns>
        public static MemoryStream ExportToExcel(ReportResult reportResult)
        {
            const string rootRels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>";
            const string rootContentTypes = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/><Override PartName=\"/xl/sharedStrings.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml\"/></Types>";
            const string workbookRels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"sheet1.xml\"/><Relationship Id=\"rId4\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings\" Target=\"sharedStrings.xml\"/></Relationships>";
            const string workbookXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"ReportExport\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>";
            const string styleXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><fonts count=\"2\"><font><sz val=\"9\"/><color rgb=\"FF333333\"/><name val=\"Arial\"/><family val=\"2\"/></font><font><b/><sz val=\"9\"/><color rgb=\"FF333333\"/><name val=\"Arial\"/><family val=\"2\"/></font></fonts><fills count=\"3\"><fill></fill><fill></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFDEDEDE\"/><bgColor indexed=\"64\"/></patternFill></fill></fills><borders count=\"2\"><border></border><border><left style=\"thin\"><color rgb=\"FF666666\"/></left><right style=\"thin\"><color rgb=\"FF666666\"/></right><top style=\"thin\"><color rgb=\"FF666666\"/></top><bottom style=\"thin\"><color rgb=\"FF666666\"/></bottom></border></borders><cellXfs count=\"3\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment wrapText=\"1\"/></xf></cellXfs></styleSheet>";

            ExcelSharedString sharedString = new ExcelSharedString();
            ExcelSheet sheetObj = new ExcelSheet(reportResult, sharedString);
            if (reportResult.IsGrouped)
            {
                reportResult.Groups.ForEach(group =>
                {
                    sheetObj.addGroupHeader(group.Name);
                    sheetObj.AddRows(group.Rows);
                });
            }
            else
            {
                sheetObj.AddRows(reportResult.Rows);
            }

            // write XLSX file
            static void AddFileToArchive(ZipArchive archive, string fileName, string content)
            {
                ZipArchiveEntry file = archive.CreateEntry(fileName, CompressionLevel.Optimal);
                using (Stream entryStream = file.Open())
                using (StreamWriter streamWriter = new StreamWriter(entryStream))
                    streamWriter.Write(content);
            }

            MemoryStream memoryStream = new MemoryStream();
            using (ZipArchive archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
            {
                AddFileToArchive(archive, "_rels/.rels", rootRels);
                AddFileToArchive(archive, "[Content_Types].xml", rootContentTypes);
                AddFileToArchive(archive, "xl/_rels/workbook.xml.rels", workbookRels);
                AddFileToArchive(archive, "xl/workbook.xml", workbookXml);
                AddFileToArchive(archive, "xl/styles.xml", styleXml);
                AddFileToArchive(archive, "xl/sharedStrings.xml", sharedString.GetXml());
                AddFileToArchive(archive, "xl/sheet1.xml", sheetObj.GetXml());
            }
            memoryStream.Position = 0;
            return memoryStream;
        }

        private class ExcelSharedString
        {
            private int wordCount;
            private List<string> wordList = new();
            private const string sharedStringXmlHeader = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" count=\"";

            public int AddString(string text)
            {
                int strPos = wordList.IndexOf(text);
                wordCount++;
                if (strPos == -1)
                {
                    wordList.Add(text);
                    return wordList.Count - 1;
                }
                return strPos;
            }

            public string GetXml()
            {
                StringBuilder returnValue = new StringBuilder(sharedStringXmlHeader);
                returnValue.Append(wordCount);
                returnValue.Append("\" uniqueCount=\"");
                returnValue.Append(wordList.Count);
                returnValue.Append("\">");
                wordList.ForEach(word =>
                {
                    returnValue.Append("<si><t>");
                    returnValue.Append(word);
                    returnValue.Append("</t></si>");
                });
                returnValue.Append("</sst>");
                return returnValue.ToString();
            }
        }

        private class ExcelSheet
        {
            private int numCols;
            private int rowCount;
            private bool isGrouped;
            private List<int> groupHeaderRows = new();
            private ExcelSharedString sharedString;
            private StringBuilder sheetXml;
            private const string sheetXmlHeader = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetPr><outlinePr summaryBelow=\"0\"/></sheetPr><sheetViews><sheetView showGridLines=\"0\" tabSelected=\"1\" workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight=\"15\" outlineLevelRow=\"1\"/><cols><col min=\"1\" max=\"16384\" width=\"15\" style=\"0\"/></cols><sheetData>";
            private enum RowType
            {
                sheetHeader,
                groupHeader,
                standard
            }

            public ExcelSheet(ReportResult reportResult, ExcelSharedString sharedString)
            {
                this.sharedString = sharedString;
                isGrouped = reportResult.IsGrouped;
                numCols = reportResult.Headers.Count;
                sheetXml = new StringBuilder(sheetXmlHeader);
                AddRow(reportResult.Headers.Select(s => s.Name).ToArray(), RowType.sheetHeader);
            }

            public void AddRows(List<ReportRow> rows)
            {
                rows.ForEach(row =>
                {
                    AddRow(row.Columns.Select(s => s.Name).ToArray(), RowType.standard);
                });
            }

            public void addGroupHeader(string header)
            {
                string[] groupHeaderRow = new string[numCols];
                groupHeaderRow[0] = header;
                AddRow(groupHeaderRow, RowType.groupHeader);
                groupHeaderRows.Add(rowCount);
            }

            public string GetXml()
            {
                sheetXml.Append("</sheetData>");
                if (isGrouped)
                {
                    string lastCol = ColIdxToColRef(numCols - 1);
                    sheetXml.Append("<mergeCells count=\"")
                            .Append(groupHeaderRows.Count)
                            .Append("\">");
                    groupHeaderRows.ForEach(groupRow =>
                    {
                        sheetXml.Append("<mergeCell ref=\"A")
                                .Append(groupRow)
                                .Append(':')
                                .Append(lastCol)
                                .Append(groupRow)
                                .Append("\"/>");
                    });
                    sheetXml.Append("</mergeCells>");
                }
                sheetXml.Append("</worksheet>");
                return sheetXml.ToString();
            }

            private void AddRow(string[] rowVals, RowType rowType)
            {
                sheetXml.Append("<row r=\"")
                        .Append(++rowCount)
                        .Append("\" spans=\"1:")
                        .Append(numCols)
                        .Append("\" s=\"")
                        .Append(rowType.Equals(RowType.standard) ? 2 : 1)
                        .Append('"');
                if (rowType.Equals(RowType.groupHeader))
                {
                    sheetXml.Append(" collapsed=\"1\"");
                }
                else if (rowType.Equals(RowType.standard) && isGrouped)
                {
                    sheetXml.Append(" hidden=\"1\" outlineLevel=\"1\"");
                }
                sheetXml.Append('>');
                for (int colIdx = 0; colIdx < rowVals.Length; colIdx++)
                {
                    string cellStr = rowVals[colIdx];
                    sheetXml.Append("<c r=\"")
                        .Append(ColIdxToColRef(colIdx))
                        .Append(rowCount)
                        .Append("\" s=\"")
                        .Append(rowType.Equals(RowType.standard) ? 2 : 1);
                    if (string.IsNullOrWhiteSpace(cellStr))
                    {
                        sheetXml.Append("\"/>");
                    }
                    else
                    {
                        sheetXml.Append("\" t=\"s\"><v>")
                                .Append(sharedString.AddString(cellStr))
                                .Append("</v></c>");
                    }
                }
                sheetXml.Append("</row>");
            }

            private static string ColIdxToColRef(int colIdx)
            {
                string colRef = "";
                colIdx++;
                while (colIdx > 0)
                {
                    int rem = (colIdx - 1) % 26;
                    colRef = Convert.ToChar('A' + rem) + colRef;
                    colIdx = (colIdx - rem) / 26;
                }
                return colRef;
            }

        }
    }
}
