import React, { useEffect, useState, useCallback } from "react";
import {
  DatePicker,
  Spin,
  Alert,
  Button,
  Space,
  Segmented,
  Breadcrumb,
  Table,
} from "antd";
import dayjs from "dayjs";
import axiosInstance from "../axiosInstance";
import { Column } from "@ant-design/plots";
import { useNavigate } from "react-router-dom";

/**
 * UsageStats – drill‑down usage dashboard (Tooltip API v5)
 */

export default function UsageStats() {
  /* ─────────── state */
  const [range, setRange] = useState([dayjs().startOf("month"), dayjs()]);
  const [filterType, setFilterType] = useState("bg"); // all | bg | no-bg
  const [rows, setRows] = useState([]); // API rows
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dealer, setDealer] = useState(null); // null when top-level
  const [viewMode, setViewMode] = useState("chart"); // "chart" or "table"

  const navigate = useNavigate();

  /* ─────────── derived */
  const totalsByDealer = rows.reduce((acc, r) => {
    acc[r.dealershipName] = (acc[r.dealershipName] || 0) + Number(r.total);
    return acc;
  }, {});

  const shotNames = [...new Set(rows.map((r) => r.shotName))];

  const topData = Object.entries(totalsByDealer).map(([k, v]) => ({
    dealershipName: k,
    total: v,
  }));
  const drillData = rows
    .filter((r) => r.dealershipName === dealer)
    .map(({ shotName, total }) => ({ shotName, total }));

  /* ─────────── fetch */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get("/usage/stats", {
        params: {
          start: range[0].format("YYYY-MM-DD"),
          end: range[1].format("YYYY-MM-DD"),
          type: filterType === "all" ? undefined : filterType,
        },
      });
      console.log("Stats data:", data);
      setRows(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [range, filterType]);

  useEffect(() => {
    fetchStats();
    setDealer(null);
  }, [fetchStats]);

  /* ─────────── csv */
  const downloadCsv = () => {
    if (!rows.length) return;
    let csv = "";
    if (!dealer) {
      csv += ["Dealership", "Total", ...shotNames].join(",") + "\n";
      Object.keys(totalsByDealer).forEach((d) => {
        const perShot = shotNames.map((s) => {
          const found = rows.find(
            (r) => r.dealershipName === d && r.shotName === s
          );
          return found ? found.total : 0;
        });
        csv += [d, totalsByDealer[d], ...perShot].join(",") + "\n";
      });
    } else {
      csv += ["Shot", "Total"].join(",") + "\n";
      drillData.forEach((r) => (csv += [r.shotName, r.total].join(",") + "\n"));
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `${dealer || filterType}_usage_carcapture_${range[0].format(
        "YYYY-MM-DD"
      )}_${range[1].format("YYYY-MM-DD")}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ─────────── chart config */
  const makeConfig = (data, xField) => {
    const colorPalette = [
      "#5B8FF9",
      "#61DDAA",
      "#65789B",
      "#F6BD16",
      "#7262FD",
      "#78D3F8",
      "#9661BC",
      "#F6903D",
      "#008685",
      "#F08BB4",
    ];
    const colorFn = (name) =>
      colorPalette[
        name.split("").reduce((s, c) => s + c.charCodeAt(0), 0) %
          colorPalette.length
      ];

    return {
      data,
      xField,
      yField: "total",
      maxColumnWidth: dealer ? 40 : 10,
      columnStyle: { cursor: dealer ? "default" : "pointer" },
      autoFit: true,
      /** Tooltip API v5 */
      tooltip: {
        title: (d) => {
          const dealerKey = dealer || d.dealershipName;
          const bodyRows = rows
            .filter((r) => r.dealershipName === dealerKey)
            .map((r) => ({ shot: r.shotName, total: r.total }));
          const total = totalsByDealer[dealerKey] || 0;

          return {
            value: dealer ? d.shotName : dealerKey,
            custom: `<div style='padding-top:4px;'>
                       <table style='font-size:12px;width:100%'>${bodyRows
                         .map(
                           (r) =>
                             `<tr><td>${r.shot}</td><td style='text-align:right;padding-left:12px'>${r.total}</td></tr>`
                         )
                         .join("")}</table>
                       <div style='margin-top:4px;font-weight:600;text-align:right'>Total: ${total}</div>
                     </div>`,
          };
        },
        Items: [
          (d) => ({
            name: dealer ? d.shotName : "Grand Total",
            value: dealer ? d.total : totalsByDealer[d.dealershipName],
            color: colorFn(d[xField]),
          }),
        ],
      },
      // deterministic bar colour
      color: ({ [xField]: name }) => colorFn(name),
    };
  };

  const chartConfig = dealer
    ? makeConfig(drillData, "shotName")
    : makeConfig(topData, "dealershipName");

  /* ─────────── click handler */
  const onBarClick = (evt) => {
    if (dealer) return;
    const name = evt?.data?.data?.dealershipName;
    if (name) setDealer(name);
  };

  /* ─────────── render */

  const grandTotal = Object.values(totalsByDealer).reduce(
    (sum, val) => sum + val,
    0
  );

  return (
    <div style={{ padding: 24 }}>
      <Space
        direction="vertical"
        size="middle"
        style={{ width: "100%", marginBottom: 24 }}
      >
        <Breadcrumb style={{ alignItems: "center" }}>
          <Breadcrumb.Item
            onClick={() => {
              navigate("/"); // Navigate to the vehicle list
            }}
          >
            <Button
              type="primary"
              icon={<span style={{ fontSize: 16 }}>←</span>}
            >
              Go Back
            </Button>
          </Breadcrumb.Item>
          <Breadcrumb.Item>Stats</Breadcrumb.Item>
        </Breadcrumb>
        {dealer && (
          <Breadcrumb>
            <Breadcrumb.Item
              style={{ cursor: "pointer" }}
              onClick={() => setDealer(null)}
            >
              Dealerships
            </Breadcrumb.Item>
            <Breadcrumb.Item>{dealer}</Breadcrumb.Item>
          </Breadcrumb>
        )}

        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          onCalendarChange={(d) => d && d[0] && d[1] && setRange(d)}
        />
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Segmented
            block
            value={filterType}
            onChange={setFilterType}
            options={[
              { label: "All", value: "all" },
              { label: "BG Removed", value: "bg" },
              { label: "No BG", value: "no-bg" },
            ]}
          />
          <Segmented
            block
            value={viewMode}
            onChange={setViewMode}
            options={[
              { label: "Chart", value: "chart" },
              { label: "Table", value: "table" },
            ]}
          />
          <Button
            type="primary"
            disabled={loading || !rows.length}
            onClick={downloadCsv}
          >
            Download CSV
          </Button>
        </Space>
      </Space>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Error"
          description={error}
          style={{ marginBottom: 20 }}
        />
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <div style={{ minHeight: 420 }}>
          {viewMode === "chart" ? (
            <Column
              {...chartConfig}
              height={400}
              onReady={(plot) => plot.on("element:click", onBarClick)}
            />
          ) : (
            <div>
              <Table
                rowKey={(record) =>
                  record.key || record.dealershipName || record.shotName
                }
                dataSource={
                  dealer
                    ? drillData.map((r) => ({ ...r, key: r.shotName }))
                    : Object.keys(totalsByDealer).map((d) => {
                        const perShot = shotNames.reduce((acc, s) => {
                          const found = rows.find(
                            (r) => r.dealershipName === d && r.shotName === s
                          );
                          acc[s] = found ? found.total : 0;
                          return acc;
                        }, {});
                        return {
                          key: d,
                          dealershipName: d,
                          total: totalsByDealer[d],
                          ...perShot,
                        };
                      })
                }
                columns={
                  dealer
                    ? [
                        {
                          title: "Shot Name",
                          dataIndex: "shotName",
                          key: "shotName",
                        },
                        { title: "Total", dataIndex: "total", key: "total" },
                      ]
                    : [
                        {
                          title: "Dealership",
                          dataIndex: "dealershipName",
                          key: "dealershipName",
                        },
                        { title: "Total", dataIndex: "total", key: "total" },
                        ...shotNames.map((s) => ({
                          title: s,
                          dataIndex: s,
                          key: s,
                        })),
                      ]
                }
                pagination={false}
              />
            </div>
          )}
          <div style={{ textAlign: "right", marginTop: 12, fontWeight: 600 }}>
            Grand Total: {grandTotal}
          </div>
        </div>
      )}
    </div>
  );
}
