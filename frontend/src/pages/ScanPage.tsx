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

  // Function to get recommendations from Gemini
  const getRecommendations = async (data: any) => {
    setIsLoadingRecommendations(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      let prompt =
        "Based on the following digital footprint data, provide specific security recommendations and privacy advice in a concise manner. ";
      prompt +=
        "Focus on actionable steps the user can take to improve their security and privacy. ";
      prompt +=
        "Format the response with bullet points and clear small concise sections.\n\n";
      prompt += "Digital Footprint Data:\n";
      prompt += JSON.stringify(data, null, 2);

      const result = await model.generateContent(prompt);
      console.log(result);
      const response = result.response;
      const text = response.text();
      console.log(text);
      setRecommendations(text);
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
          query: targetInput, // Example payload; replace with actual input data
        }),
      });
      console.log(response);
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.json();
      const { nodes, edges } = mapApiResponseToGraph(data);
      setNodes(nodes);
      setEdges(edges);
      await getRecommendations(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const startScan = () => {
    if (!targetInput) {
      alert("Please enter a target domain, IP, or email");
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

    const nodeIdMapping: Record<string, string> = {};

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

    if (!data || !data.ipapi.dns_info) {
      console.error("Invalid or empty API response");
      return { nodes, edges }; // Return empty nodes and edges
    }
    // Add DNS/IP information as the root node
    const dnsIpNodeId = "dns-ip-node";
    nodes.push({
      id: dnsIpNodeId,
      data: {
        label: data.ipapi.dns_info.dns.geo || "Unknown Location",
        type: "ip",
        details: {
          value: data.ipapi.dns_info.dns.ip,
          riskLevel: "medium",
          description: `Geo: ${data.ipapi.dns_info.dns.geo}`,
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

    if (!data || !data.ipapi.ip_info) {
      console.error("Invalid or empty API response");
      return { nodes, edges }; // Return empty nodes and edges
    }

    const threatNodeId = "threatfox-node";

    if (data.threatfox && data.threatfox.ioc) {
      nodes.push({
        id: threatNodeId,
        data: {
          label: "ThreatFox",
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
    }

    const internetDbNodeId = "internetdb-node";

    // Check if there's data to display (hostnames or ports)
    const hasRelevantData =
      data.internetdb.hostnames.length > 0 || data.internetdb.ports.length > 0;

    if (hasRelevantData) {
      nodes.push({
        id: internetDbNodeId,
        data: {
          label: "InternetDB",
          type: "vulnerability",
          details: {
            value: "Internet Database",
            riskLevel: "medium",
            description: [
              data.internetdb.hostnames.length > 0
                ? `Hostnames: <br/> ${data.internetdb.hostnames
                    .map(
                      (hostname: string) =>
                        `<a href="http://${hostname}" target="_blank" class="text-blue-500 break-words" >${hostname}</a>`
                    )
                    .join("<br/>")}`
                : "",
              data.internetdb.ports.length > 0
                ? `<br/>Ports: ${data.internetdb.ports.join(", ")} <br/>`
                : "",
              data.internetdb.cves.length > 0
                ? `CVEs: <br/>${data.internetdb.cves
                    .map((cve: any) => {
                      const cveId = Object.keys(cve)[0];
                      return `<a href="${cve[cveId]}" target="_blank" class="text-blue-500">${cveId}</a>`;
                    })
                    .join("<br/>")}`
                : "",
              data.internetdb.tags.length > 0
                ? `<br/>Tags: ${data.internetdb.tags.join(", ")}`
                : "",
            ]
              .filter(Boolean)
              .join("\n"), // Filter out empty strings
          },
        },
        position: { x: 0, y: 250 },
        className: "bg-purple-500 text-white rounded-lg p-2 shadow-lg",
      });
    }

    // Add IP info nodes
    data.ipapi.ip_info.forEach((ip: any, index: number) => {
      const ipNodeId = `ip-info-${index}`;
      nodeIdMapping[ip.city] = ipNodeId;

      nodes.push({
        id: ipNodeId,
        data: {
          label: ip.as,
          type: "ip",
          details: {
            value: "ip info",
            riskLevel: "low",
            description: [
              `ISP: ${ip.isp}`,
              `ORG: ${ip.org}`,
              `Region: ${ip.region}`,
              `Region Name: ${ip.regionName}`,
              `Country: ${ip.country}`,
              `Time Zone: ${ip.timezone}`,
              `Zip: ${ip.zip}`,
            ].join("<br/>"),
          },
        },
        position: { x: 200 * (index + 1), y: 100 },
        className: "bg-blue-500 text-white rounded-lg p-2 shadow-lg",
      });

      edges.push({
        id: `e-${internetDbNodeId}-${ipNodeId}`, // Unique edge ID
        target: internetDbNodeId, // Source node is InternetDB
        source: ipNodeId, // Target node is the current IP info node
        animated: true, // Optional: animated edge for a dynamic effect
      });

      // Create an edge from the user node to the current IP info node
      edges.push({
        id: `e-${userNodeId}-${ipNodeId}`, // Unique edge ID
        source: userNodeId, // Source node is the user node
        target: ipNodeId, // Target node is the current IP info node
        animated: true, // Optional: animated edge for a dynamic effect
      });
      if (data.threatfox && data.threatfox.ioc) {
        edges.push({
          id: `e-${threatNodeId}-${ipNodeId}`, // Unique edge ID
          target: threatNodeId, // Source node is InternetDB
          source: ipNodeId, // Target node is the current IP info node
          animated: true, // Optional: animated edge for a dynamic effect
        });
      }
    });

    // Add ThreatFox node

    // Add additional nodes as needed
    if (data.talos && typeof data.talos.blacklisted === "boolean") {
      const talosNodeId = "talos-node";
      nodes.push({
        id: talosNodeId,
        data: {
          label: "Talos",
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
        id: `e-${dnsIpNodeId}-${talosNodeId}`,
        source: userNodeId,
        target: talosNodeId,
        animated: true,
      });
    }

    if (data.tor && data.tor.exit_node) {
      const torNodeId = "tor-node";
      nodes.push({
        id: torNodeId,
        data: {
          label: "Tor",
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
        id: `e-${dnsIpNodeId}-${torNodeId}`,
        source: userNodeId,
        target: torNodeId,
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
