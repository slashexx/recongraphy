import React, { useState, useCallback, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  Download,
  Calendar,
  RefreshCw,
  Network,
  Server,
  Wifi,
  Database,
  Globe,
  Mail,
  User,
  Link2,
  Lightbulb,
} from "lucide-react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";

interface Asset {
  id: string;
  name: string;
  type: "domain" | "subdomain" | "ip" | "email" | "social" | "vulnerability";
  details: {
    value: string;
    riskLevel: "high" | "medium" | "low";
    description?: string;
    lastSeen?: string;
    source?: string;
  };
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Custom node styles
const nodeTypes = {
  domain: { background: "#818cf8", icon: Globe },
  subdomain: { background: "#60a5fa", icon: Globe },
  ip: { background: "#34d399", icon: Network },
  email: { background: "#fbbf24", icon: Mail },
  social: { background: "#f87171", icon: User },
  vulnerability: { background: "#f43f5e", icon: AlertTriangle },
};

// Initial nodes and edges for the graph

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e1-3", source: "1", target: "3", animated: true },
  { id: "e2-4", source: "2", target: "4", animated: true },
  { id: "e1-5", source: "1", target: "5", animated: true },
];

function ScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string>("");
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);
  const [results, setResults] = useState<any>(null);

  // Function to get recommendations from Gemini
  const getRecommendations = async (data: any) => {
    setIsLoadingRecommendations(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      let prompt =
        "Based on the following digital data of a website, provide specific security recommendations and privacy advice in a concise manner. ";
      prompt +=
        "Focus on actionable steps the user can take to improve their security and privacy. ";
      prompt +=
        "Format the response with bullet points and clear small concise sections.\n\n";
      prompt += "Scan Results Data:\n";
      prompt += JSON.stringify(data, null, 2);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      setRecommendations(text);
      setResults(data);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      setRecommendations(
        "Unable to generate recommendations at this time. Please try again later."
      );
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // useEffect(() => {
  //   async function fetchData() {
  //     setIsLoading(true);
  //     try {
  //       const response = await fetch("http://localhost:5000/scan", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           query: targetInput, // Example payload; replace with actual input data
  //         }),
  //       });
  //       console.log(response);
  //       if (!response.ok) throw new Error("Failed to fetch data");
  //       const data = await response.json();
  //       const { nodes, edges } = mapApiResponseToGraph(data);
  //       setNodes(nodes);
  //       setEdges(edges);
  //     } catch (error) {
  //       console.error("Error fetching data:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }

  //   fetchData();
  // }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: targetInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const { nodes, edges } = mapApiResponseToGraph(data);
      setNodes(nodes);
      setEdges(edges);
      await getRecommendations(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      // Show error to user
      alert(error instanceof Error ? error.message : "An error occurred during scanning");
    } finally {
      setIsLoading(false);
    }
  }

  const startScan = () => {
    if (!targetInput) {
      alert("Please enter a target domain, IP, or email");
      return;
    }

    // Validate input format
    const isIP = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(targetInput);
    const isDomain = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(targetInput);
    const isEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(targetInput);

    if (!isIP && !isDomain && !isEmail) {
      alert("Please enter a valid IP address, domain, or email");
      return;
    }

    fetchData();
    setIsScanning(true);
    setProgress(0);
    setScanComplete(false);

    // Simulate scan progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setScanComplete(true);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedAsset({
      id: node.id,
      name: node.data.label,
      type: node.data.type,
      details: node.data.details,
    });
  }, []);

  const mapApiResponseToGraph = (data: any) => {
    const nodes: any[] = [];
    const edges: any[] = [];

    const userNodeId = "user-node";
    nodes.push({
      id: userNodeId,
      data: {
        label: targetInput, // Use user input as the label
        type: "input",
        details: {
          value: targetInput,
          riskLevel: "unknown",
          description: targetInput,
        },
      },
      position: { x: 0, y: 0 },
      className: "bg-gray-500 text-white rounded-lg p-2 shadow-lg",
    });

    // IPAPI DNS Info
    if (data?.ipapi?.dns_info?.dns) {
      const dns = data.ipapi.dns_info.dns;
      const dnsIpNodeId = "dns-ip-node";
      nodes.push({
        id: dnsIpNodeId,
        data: {
          label: `${dns.geo || "Unknown Location"} (${dns.ip})`,
          type: "ip",
          details: {
            value: dns.ip,
            riskLevel: "medium",
            description: `Geo: ${dns.geo}`,
          },
        },
        position: { x: 0, y: 150 },
        className: "bg-green-500 text-white rounded-lg p-2 shadow-lg",
      });
      edges.push({
        id: `e-${userNodeId}-${dnsIpNodeId}`,
        source: userNodeId,
        target: dnsIpNodeId,
        animated: true,
      });
    }

    // IPAPI IP Info
    if (Array.isArray(data?.ipapi?.ip_info)) {
      data.ipapi.ip_info.forEach((ip: any, index: number) => {
        const ipNodeId = `ip-info-${index}`;
        nodes.push({
          id: ipNodeId,
          data: {
            label: `${ip.as || "AS"} (${ip.city || "Unknown City"})`,
            type: "ip",
            details: {
              value: ip.query,
              riskLevel: "low",
              description: [
                `ISP: ${ip.isp}`,
                `ORG: ${ip.org}`,
                `Region: ${ip.region}`,
                `Region Name: ${ip.regionName}`,
                `Country: ${ip.country}`,
                `Time Zone: ${ip.timezone}`,
                `Zip: ${ip.zip}`,
              ].join("<br/>")
            },
          },
          position: { x: 200 * (index + 1), y: 100 },
          className: "bg-blue-500 text-white rounded-lg p-2 shadow-lg",
        });
        edges.push({
          id: `e-${userNodeId}-${ipNodeId}`,
          source: userNodeId,
          target: ipNodeId,
          animated: true,
        });
      });
    }

    // InternetDB
    if (data?.internetdb) {
      const internetDbNodeId = "internetdb-node";
      const hostnames = data.internetdb.hostnames || [];
      const ports = data.internetdb.ports || [];
      const cves = data.internetdb.cves || [];
      const tags = data.internetdb.tags || [];
      nodes.push({
        id: internetDbNodeId,
        data: {
          label: `InternetDB (${hostnames.length} hostnames, ${ports.length} ports)` ,
          type: "vulnerability",
          details: {
            value: "Internet Database",
            riskLevel: "medium",
            description: [
              hostnames.length > 0 ? `Hostnames: <br/>${hostnames.map((hostname: string) => `<a href=\"http://${hostname}\" target=\"_blank\" class=\"text-blue-500 break-words\">${hostname}</a>`).join("<br/>")}` : "",
              ports.length > 0 ? `<br/>Ports: ${ports.join(", ")} <br/>` : "",
              cves.length > 0 ? `CVEs: <br/>${cves.map((cve: any) => { const cveId = Object.keys(cve)[0]; return `<a href=\"${cve[cveId]}\" target=\"_blank\" class=\"text-blue-500\">${cveId}</a>`; }).join("<br/>")}` : "",
              tags.length > 0 ? `<br/>Tags: ${tags.join(", ")}` : "",
            ].filter(Boolean).join("\n"),
          },
        },
        position: { x: 0, y: 250 },
        className: "bg-purple-500 text-white rounded-lg p-2 shadow-lg",
      });
      edges.push({
        id: `e-${userNodeId}-${internetDbNodeId}`,
        source: userNodeId,
        target: internetDbNodeId,
        animated: true,
      });
    }

    // Talos
    if (data?.talos && typeof data.talos.blacklisted === "boolean") {
      const talosNodeId = "talos-node";
      nodes.push({
        id: talosNodeId,
        data: {
          label: `Talos (Blacklisted: ${data.talos.blacklisted})`,
          type: "social",
          details: {
            value: "Blacklisted Status",
            riskLevel: data.talos.blacklisted ? "high" : "low",
            description: `Blacklisted: ${data.talos.blacklisted}`,
          },
        },
        position: { x: -200, y: 200 },
        className: "bg-yellow-500 text-white rounded-lg p-2 shadow-lg",
      });
      edges.push({
        id: `e-${userNodeId}-${talosNodeId}`,
        source: userNodeId,
        target: talosNodeId,
        animated: true,
      });
    }

    // ThreatFox
    if (data?.threatfox && data.threatfox.ioc) {
      const threatNodeId = "threatfox-node";
      nodes.push({
        id: threatNodeId,
        data: {
          label: `ThreatFox (${data.threatfox.malware || "No malware"})`,
          type: "vulnerability",
          details: {
            value: data.threatfox.ioc,
            riskLevel: "high",
            description: `Malware: ${data.threatfox.malware}, Link: ${data.threatfox.link}`,
          },
        },
        position: { x: 200, y: 200 },
        className: "bg-red-500 text-white rounded-lg p-2 shadow-lg",
      });
      edges.push({
        id: `e-${userNodeId}-${threatNodeId}`,
        source: userNodeId,
        target: threatNodeId,
        animated: true,
      });
    }

    // Tor
    if (data?.tor && data.tor.exit_node) {
      const torNodeId = "tor-node";
      nodes.push({
        id: torNodeId,
        data: {
          label: `Tor (Exit Node: ${data.tor.exit_node})`,
          type: "ip",
          details: {
            value: "Exit Node",
            riskLevel: data.tor.exit_node ? "high" : "low",
            description: `Exit Node: ${data.tor.exit_node}`,
          },
        },
        position: { x: -300, y: 150 },
        className: "bg-yellow-500 text-white rounded-lg p-2 shadow-lg",
      });
      edges.push({
        id: `e-${userNodeId}-${torNodeId}`,
        source: userNodeId,
        target: torNodeId,
        animated: true,
      });
    }

    // Tranco (if available)
    if (data?.tranco && data.tranco.rank) {
      const trancoNodeId = "tranco-node";
      nodes.push({
        id: trancoNodeId,
        data: {
          label: `Tranco Rank: ${data.tranco.rank}`,
          type: "domain",
          details: {
            value: data.tranco.rank,
            riskLevel: "low",
            description: `Tranco rank for this domain: ${data.tranco.rank}`,
          },
        },
        position: { x: 300, y: 300 },
        className: "bg-blue-400 text-white rounded-lg p-2 shadow-lg",
      });
      edges.push({
        id: `e-${userNodeId}-${trancoNodeId}`,
        source: userNodeId,
        target: trancoNodeId,
        animated: true,
      });
    }

    return { nodes, edges };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          Attack Surface Scan
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Map and visualize your attack surface by scanning domains, IPs, and
          digital footprint
        </p>
      </div>

      <div className="mt-12">
        <div className="bg-white dark:bg-zinc-900 dark:text-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {/* Target Input */}
            <div className="max-w-xl mx-auto mb-8">
              <label
                htmlFor="target"
                className="block text-sm font-medium text-gray-700 dark:text-white"
              >
                Target Domain, IP, or Email
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="target"
                  id="target"
                  className="flex-1 min-w-0 block w-full px-3 py-2 dark:bg-stone-600 rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="example.com"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                />
                <button
                  onClick={startScan}
                  disabled={isScanning}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-5 w-5" />
                      Start Scan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isScanning && (
              <div className="max-w-xl mx-auto mb-8">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-sm text-gray-500 text-center">
                  Scanning target... {progress}%
                </p>
              </div>
            )}

            {/* Attack Surface Graph */}
            {(scanComplete || nodes.length > 0) && (
              <div className="mt-8">
                <div
                  className="bg-gray-50 rounded-3xl"
                  style={{ height: "600px" }}
                >
                  <ReactFlow
                    className="dark:bg-black bg-gray-50 rounded-2xl"
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={(_, node) => setSelectedAsset(node.data)}
                    fitView
                  >
                    <Background />
                    <Controls />
                    <MiniMap />
                  </ReactFlow>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                  {Object.entries(nodeTypes).map(
                    ([type, { background, icon: Icon }]) => (
                      <div key={type} className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: background }}
                        ></div>
                        <Icon className="h-4 w-4" />
                        <span className="text-sm text-gray-600 dark:text-white capitalize">
                          {type}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Security Findings Summary */}
            {(scanComplete || nodes.length > 0) && results && (
              <div className="mt-8 bg-white dark:bg-zinc-900 shadow sm:rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Security Findings Summary</h2>
                <ul className="list-disc ml-6 text-gray-800 dark:text-gray-200">
                  {/* Blacklist status */}
                  {results.talos && (
                    <li>
                      <span className="font-semibold">Talos Blacklist:</span> {results.talos.blacklisted ? <span className="text-red-500">Blacklisted</span> : <span className="text-green-500">Not Blacklisted</span>}
                    </li>
                  )}
                  {/* ThreatFox malware */}
                  {results.threatfox && results.threatfox.malware && (
                    <li>
                      <span className="font-semibold">ThreatFox Malware:</span> <span className="text-red-500">{results.threatfox.malware}</span> (<a href={results.threatfox.link} target="_blank" rel="noopener noreferrer" className="underline text-blue-500">Details</a>)
                    </li>
                  )}
                  {/* InternetDB open ports */}
                  {results.internetdb && results.internetdb.ports && results.internetdb.ports.length > 0 && (
                    <li>
                      <span className="font-semibold">Open Ports:</span> {results.internetdb.ports.join(", ")}
                    </li>
                  )}
                  {/* InternetDB CVEs */}
                  {results.internetdb && results.internetdb.cves && results.internetdb.cves.length > 0 && (
                    <li>
                      <span className="font-semibold">Vulnerabilities (CVEs):</span> {results.internetdb.cves.map((cve: any, idx: number) => {
                        const cveId = Object.keys(cve)[0];
                        return <a key={cveId} href={cve[cveId]} target="_blank" rel="noopener noreferrer" className="underline text-blue-500 mr-2">{cveId}</a>;
                      })}
                    </li>
                  )}
                  {/* InternetDB tags */}
                  {results.internetdb && results.internetdb.tags && results.internetdb.tags.length > 0 && (
                    <li>
                      <span className="font-semibold">Tags:</span> {results.internetdb.tags.join(", ")}
                    </li>
                  )}
                  {/* IPAPI ASN/ISP/Geo */}
                  {results.ipapi && results.ipapi.ip_info && Array.isArray(results.ipapi.ip_info) && results.ipapi.ip_info.length > 0 && (
                    <li>
                      <span className="font-semibold">ASN/ISP/Geo:</span> {results.ipapi.ip_info[0].as} / {results.ipapi.ip_info[0].isp} / {results.ipapi.ip_info[0].country}
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Asset Details Modal */}
            {selectedAsset && (
              <div
                className="fixed inset-0 overflow-y-auto"
                aria-labelledby="modal-title"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    aria-hidden="true"
                  ></div>
                  <span
                    className="hidden sm:inline-block sm:align-middle sm:h-screen"
                    aria-hidden="true"
                  >
                    &#8203;
                  </span>
                  <div className="inline-block align-bottom bg-white dark:bg-zinc-700 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    <div>
                      <div className="mt-3 sm:mt-5">
                        <h3
                          className="text-lg leading-6 font-medium text-gray-900 dark:text-white"
                          id="modal-title"
                        >
                          Asset Details
                        </h3>
                        <div className="mt-2">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 dark:text-white">
                                Type
                              </h4>
                              <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                                {selectedAsset.type}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 dark:text-white">
                                Value
                              </h4>
                              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                {selectedAsset.details.value}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 dark:text-white">
                                Risk Level
                              </h4>
                              <span
                                className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  selectedAsset.details.riskLevel === "high"
                                    ? "bg-red-100 text-red-800"
                                    : selectedAsset.details.riskLevel ===
                                      "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {selectedAsset.details.riskLevel
                                  .charAt(0)
                                  .toUpperCase() +
                                  selectedAsset.details.riskLevel.slice(1)}
                              </span>
                            </div>
                            {selectedAsset.details.description && (
                              <div>
                                <h4 className="text-md font-medium text-gray-500 dark:text-white">
                                  Description
                                </h4>
                                <div
                                  className="mt-1 text-md font-semibold text-gray-900 dark:text-white"
                                  dangerouslySetInnerHTML={{
                                    __html: selectedAsset.details.description,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 sm:mt-6">
                      <button
                        type="button"
                        className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                        onClick={() => setSelectedAsset(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations Section */}
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center">
                <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                  Actionable Security Recommendations
                </h4>
              </div>
              {isLoadingRecommendations ? (
                <div className="mt-4 flex items-center justify-center">
                  <RefreshCw className="animate-spin h-5 w-5 mr-2 text-indigo-500" />
                  <p>Generating recommendations...</p>
                </div>
              ) : (
                <div className="mt-4 prose prose-sm max-w-none">
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
                    {/* Render the markdown content */}
                    <ReactMarkdown className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-white">
                      {recommendations || "No recommendations available."}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanPage;
