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
  icon?: string;
}
import { GoogleGenerativeAI } from "@google/generative-ai";

// Custom node styles
const nodeTypes = {
  domain: { background: "#818cf8", icon: Globe },
  subdomain: { background: "#60a5fa", icon: Globe },
  ip: { background: "#34d399", icon: Network },
  email: { background: "#fbbf24", icon: Mail },
  social: { background: "#f87171", icon: User },
  vulnerability: { background: "#f43f5e", icon: AlertTriangle },
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Initial nodes and edges for the graph

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e1-3", source: "1", target: "3", animated: true },
  { id: "e2-4", source: "2", target: "4", animated: true },
  { id: "e1-5", source: "1", target: "5", animated: true },
];

interface FootprintData {
  query: string;
  type: 'email' | 'phone' | 'username' | null;
  email_scan: {
    exposed: boolean;
    breaches: Array<{
      breach: string;
      details: string;
      xposed_data: string;
      xposed_records: string;
      references: string;
    }>;
    password_strength: Array<{
      EasyToCrack: number;
      PlainText: number;
      StrongHash: number;
      Unknown: number;
    }>;
    risk: Array<{
      risk_label: 'high' | 'medium' | 'low';
      risk_score: number;
    }>;
  } | null;
  phone_scan: {
    valid: boolean;
    number: string;
    local_format: string;
    international_format: string;
    country_code: string;
    country_name: string;
    location: string;
    carrier: string;
    line_type: string;
  } | null;
  username_scan: Array<{
    site: string;
    url: string;
  }> | null;
}

interface SiteIcon {
  [key: string]: string;
}

interface UsernameEntry {
  site: string;
  url: string;
}

function DigitalFootprint() {
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

  const NODE_SPACING = 250; // Space between nodes
  const BASE_Y = 150; // Base vertical position
  const Y_OFFSET = 50; // Maximum height difference for the arc

  // Function to get recommendations from Gemini
  const getRecommendations = async (data: any) => {
    setIsLoadingRecommendations(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

  const mapApiResponseToGraph = (data: FootprintData) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create central node for the query
    const centralNodeId = "central-node";
    nodes.push({
      id: centralNodeId,
      data: {
        label: data.query,
        type: data.type || "unknown",
        details: {
          value: data.query,
          riskLevel: "unknown",
          description: `Type: ${data.type || "unknown"}`,
        },
      },
      position: { x: 0, y: 0 },
      className: "bg-gray-500 text-white rounded-lg p-2 shadow-lg",
    });

    // Handle email scan results from HaveIBeenPwned API
    if (data.type === "email" && data.email_scan) {
      const emailScan = data.email_scan;
      
      // Add breach check node
      const breachNodeId = "breach-check-node";
      nodes.push({
        id: breachNodeId,
        data: {
          label: "Data Breach Check",
          type: "breach",
          details: {
            value: emailScan.exposed ? "Exposed in Breaches" : "No Breaches Found",
            riskLevel: emailScan.risk?.[0]?.risk_label || "unknown",
            description: emailScan.exposed 
              ? `Found in ${emailScan.breaches.length} data breaches`
              : "No known data breaches found",
          },
        },
        position: { x: -200, y: -100 },
        className: emailScan.exposed ? "bg-red-500" : "bg-green-500" + " text-white rounded-lg p-2 shadow-lg",
      });
      edges.push({
        id: `e-${centralNodeId}-${breachNodeId}`,
        source: centralNodeId,
        target: breachNodeId,
        animated: true,
      });

      // Add breach details if found
      if (emailScan.exposed && emailScan.breaches) {
        emailScan.breaches.forEach((breach, index) => {
          const breachDetailId = `breach-detail-${index}`;
          const angle = (index / emailScan.breaches.length) * 2 * Math.PI;
          const radius = 150;
          const x = Math.cos(angle) * radius - 200;
          const y = Math.sin(angle) * radius - 100;

          nodes.push({
            id: breachDetailId,
            data: {
              label: breach.breach,
              type: "breach-detail",
              details: {
                value: breach.breach,
                riskLevel: "high",
                description: [
                  `Details: ${breach.details}`,
                  `Exposed Data: ${breach.xposed_data}`,
                  `Records: ${breach.xposed_records}`,
                  `<a href="${breach.references}" target="_blank" class="text-blue-500">More Info</a>`,
                ].join("<br/>"),
              },
            },
            position: { x, y },
            className: "bg-red-600 text-white rounded-lg p-2 shadow-lg",
          });

          edges.push({
            id: `e-${breachNodeId}-${breachDetailId}`,
            source: breachNodeId,
            target: breachDetailId,
            animated: true,
          });
        });
      }

      // Add password strength analysis if available
      if (emailScan.password_strength) {
        const strengthNodeId = "password-strength-node";
        nodes.push({
          id: strengthNodeId,
          data: {
            label: "Password Strength Analysis",
            type: "security",
            details: {
              value: "Password Security Metrics",
              riskLevel: "medium",
              description: emailScan.password_strength.map(strength => [
                `Easy to Crack: ${strength.EasyToCrack}`,
                `Plain Text: ${strength.PlainText}`,
                `Strong Hash: ${strength.StrongHash}`,
                `Unknown: ${strength.Unknown}`,
              ].join("<br/>")).join("<br/>"),
            },
          },
          position: { x: 200, y: -100 },
          className: "bg-yellow-500 text-white rounded-lg p-2 shadow-lg",
        });
        edges.push({
          id: `e-${centralNodeId}-${strengthNodeId}`,
          source: centralNodeId,
          target: strengthNodeId,
          animated: true,
        });
      }
    }

    // Handle phone scan results from NumVerify API
    if (data.type === "phone" && data.phone_scan) {
      const phoneScan = data.phone_scan;
      
      // Add phone info node
      const phoneNodeId = "phone-info-node";
      nodes.push({
        id: phoneNodeId,
        data: {
          label: "Phone Information",
          type: "phone",
          details: {
            value: phoneScan.number,
            riskLevel: "low",
            description: [
              `Location: ${phoneScan.location}`,
              `Carrier: ${phoneScan.carrier}`,
              `Line Type: ${phoneScan.line_type}`,
              `Country: ${phoneScan.country_name}`,
            ].join("<br/>"),
          },
        },
        position: { x: 0, y: -200 },
        className: "bg-blue-500 text-white rounded-lg p-2 shadow-lg",
      });
      edges.push({
        id: `e-${centralNodeId}-${phoneNodeId}`,
        source: centralNodeId,
        target: phoneNodeId,
        animated: true,
      });
    }

    // Only show username scan results from our OSINT API
    // Only include entries that are confirmed as found (i.e., have a valid, non-empty URL)
    const usernameScan = (data.username_scan || []).filter(
      (entry) => entry && entry.url && entry.url.trim() !== ""
    );
    if (usernameScan.length > 0) {
      const socialNodeId = "social-presence-node";
      nodes.push({
        id: socialNodeId,
        data: {
          label: "Found Online Presence",
          type: "social",
          details: {
            value: `Found on ${usernameScan.length} platforms`,
            riskLevel: "low",
            description: "Verified online accounts",
          },
        },
        position: { x: 0, y: 200 },
        className: "bg-purple-500 text-white rounded-lg p-2 shadow-lg",
      });
      edges.push({
        id: `e-${centralNodeId}-${socialNodeId}`,
        source: centralNodeId,
        target: socialNodeId,
        animated: true,
      });

      // Add individual platform nodes
      usernameScan.forEach((entry, index) => {
        const nodeId = `platform-${index}`;
        const angle = (index / usernameScan.length) * 2 * Math.PI;
        const radius = 150;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius + 200;

        nodes.push({
          id: nodeId,
          data: {
            label: entry.site,
            type: "platform",
            details: {
              value: entry.url,
              riskLevel: "low",
              description: `<a href="${entry.url}" target="_blank" class="text-blue-500">Visit Profile</a>`,
            },
          },
          position: { x, y },
          className: "bg-purple-400 text-white rounded-lg p-2 shadow-lg",
        });

        edges.push({
          id: `e-${socialNodeId}-${nodeId}`,
          source: socialNodeId,
          target: nodeId,
          animated: true,
        });
      });
    }

    return { nodes, edges };
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/footprint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: targetInput,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      const { nodes, edges } = mapApiResponseToGraph(data);
      setNodes(nodes);
      setEdges(edges);
      await getRecommendations(data);
      setScanComplete(true);
    } catch (error: unknown) {
      console.error("Error fetching data:", error);
      alert("Failed to scan digital footprint. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white  sm:text-4xl">
          Get Your Digitial Footprint
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Map and visualize your digital footprint
        </p>
      </div>

      <div className="mt-12">
        <div className="bg-white dark:bg-zinc-900 dark:text-white  shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {/* Target Input */}
            <div className="max-w-xl mx-auto mb-8">
              <label
                htmlFor="target"
                className="block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Email id, Phone number or Username
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="target"
                  id="target"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border-gray-300 dark:bg-zinc-700 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                        <span className="text-sm text-gray-600 capitalize">
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
                  <div className="inline-block align-bottom bg-white dark:bg-zinc-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
                    <div>
                      <div className="mt-3 sm:mt-5">
                        <h3
                          className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200"
                          id="modal-title"
                        >
                          Asset Details
                        </h3>
                        <div className="mt-2">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-200">
                                Type
                              </h4>
                              <p className="mt-1 text-sm text-gray-900 dark:text-gray-200 capitalize">
                                {selectedAsset.type}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-200">
                                Value
                              </h4>
                              <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
                                {selectedAsset.details.value}
                              </p>
                            </div>

                            {selectedAsset.details.description && (
                              <div>
                                <h4 className="text-md font-medium text-gray-500 dark:text-gray-200">
                                  Description
                                </h4>
                                <div
                                  className="mt-1 text-md font-semibold text-gray-900 dark:text-gray-200"
                                  dangerouslySetInnerHTML={{
                                    __html: selectedAsset.details.description,
                                  }}
                                />
                              </div>
                            )}
                            {selectedAsset.icon && (
                              <div>
                                <img
                                  src={selectedAsset.icon}
                                  alt="icon"
                                  className="w-6 h-6"
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
                <Lightbulb className="h-5 w-5 text-yellow-500 dark:text-gray-200 dark:text-gray-200 mr-2" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-300">
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
                    <ReactMarkdown className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
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

export default DigitalFootprint;
