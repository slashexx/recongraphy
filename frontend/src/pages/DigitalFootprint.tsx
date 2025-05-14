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

  async function fetchData() {
    setIsLoading(true);
    try {
      // Single API request
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/footprint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: targetInput, // Example payload; replace with actual input data
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
  
      // Parse the JSON from the response
      const data = await response.json();
  
      // Process and map the data to nodes and edges
      const { nodes, edges } = mapApiResponseToGraph(data);
      setNodes(nodes);
      setEdges(edges);
  
      // Call additional functions if needed
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

    // Create sub-nodes for the email scan details
    const emailScanNodeId = "email-scan-node";

    if (data.email_scan) {
      // Check if there is an error or breach data
      if (data.email_scan.error) {
        // Handle case where there's an error message
        nodes.push({
          id: emailScanNodeId,
          data: {
            label: "Email Scan",
            type: "email-scan",
            details: {
              value: "Email Scan Result",
              description: `
              <div>
                <p class="text-red-500">${data.email_scan.error}</p>
              </div>
            `,
            },
          },
          position: { x: 200, y: 150 },
          className: "bg-red-500 text-white rounded-lg p-2 shadow-lg",
        });
        edges.push({
          id: `e-${userNodeId}-${emailScanNodeId}`,
          source: userNodeId,
          target: emailScanNodeId,
          animated: true,
        });
      } else {
        // Handle case where breaches data exists
        nodes.push({
          id: emailScanNodeId,
          data: {
            label: "Email Scan",
            type: "email-scan",
            details: {
              value: "Email Breaches",
              description: data.email_scan.breaches
                .map((breach: any) => {
                  return `
                  <div>
                    <h5 class="font-semibold">${breach.breach}</h5>
                    <p><strong>Details:</strong> ${breach.details}</p>
                    <p><strong>Exposed Data:</strong> ${breach.xposed_data}</p>
                    <p><strong>Records Exposed:</strong> ${breach.xposed_records}</p>
                    <p><a href="${breach.references}" target="_blank" class="text-blue-500">More Info</a></p>
                  </div>
                `;
                })
                .join("<br/>"),
            },
          },
          position: { x: 200, y: 200 },
          className: "bg-red-500 text-white rounded-lg p-2 shadow-lg",
        });

        // Create sub-node for password strength
        const passwordStrengthNodeId = "password-strength-node";
        nodes.push({
          id: passwordStrengthNodeId,
          data: {
            label: "Password Strength",
            type: "password-strength",
            details: {
              value: "Password Strength Overview",
              description: data.email_scan.password_strength
                .map((strength: any) => {
                  return `
                <div>
                  <p><strong>Easy To Crack:</strong> ${strength.EasyToCrack}</p>
                  <p><strong>Plain Text:</strong> ${strength.PlainText}</p>
                  <p><strong>Strong Hash:</strong> ${strength.StrongHash}</p>
                  <p><strong>Unknown:</strong> ${strength.Unknown}</p>
                </div>
              `;
                })
                .join("<br/>"),
            },
          },
          position: { x: 0, y: 200 },
          className: "bg-yellow-500 text-white rounded-lg p-2 shadow-lg",
        });

        // Create sub-node for risk
        const riskNodeId = "risk-node";
        nodes.push({
          id: riskNodeId,
          data: {
            label: "Risk",
            type: "risk",
            details: {
              value: "Risk Assessment",
              description: `
            <div>
              <p><strong>Risk Level:</strong> ${data.email_scan.risk[0].risk_label}</p>
              <p><strong>Risk Score:</strong> ${data.email_scan.risk[0].risk_score}</p>
            </div>
          `,
            },
          },
          position: { x: -200, y: 200 },
          className: `${data.email_scan.risk[0].risk_label === 'high' ? 'bg-red-500' :
            data.email_scan.risk[0].risk_label === 'low' ? 'bg-green-500' : 'bg-yellow-500'} text-white rounded-lg p-2 shadow-lg`,
        });

        // Create edges from the user node to each sub-node
        edges.push(
          {
            id: `e-${userNodeId}-${emailScanNodeId}`,
            source: userNodeId,
            target: emailScanNodeId,
            animated: true,
          },
          {
            id: `e-${userNodeId}-${passwordStrengthNodeId}`,
            source: userNodeId,
            target: passwordStrengthNodeId,
            animated: true,
          },
          {
            id: `e-${userNodeId}-${riskNodeId}`,
            source: userNodeId,
            target: riskNodeId,
            animated: true,
          }
        );
      }
    } else if (data.phone_scan) {
      const phoneScanNodeId = "phone-scan-node";
      if (data.phone_scan.phone_no == false) {
        nodes.push({
          id: phoneScanNodeId,
          data: {
            label: "Phone Scan",
            type: "phone-scan",
            details: {
              value: "Phone Scan Result",
              description: `
                    <div>
                      <p class="text-red-500">Record Not Found!, Phone Number maybe Invalid. Try adding your country code and check</p>
                    </div>
                  `,
            },
          },
          position: { x: 50, y: 150 },
          className: "bg-red-500 text-white rounded-lg p-2 shadow-lg",
        });
        edges.push({
          id: `e-${userNodeId}-${phoneScanNodeId}`,
          source: userNodeId,
          target: phoneScanNodeId,
          animated: true,
        });
      } else {
        const countryLocationNodeId = `country-location-${userNodeId}`;
        const carrierFormatsNodeId = `carrier-formats-${userNodeId}`;
        const lineTypeNodeId = `line-type-${userNodeId}`;
        const validityNodeId = `validity-${userNodeId}`;

        const isValid = data.phone_scan.valid;

        nodes.push({
          id: countryLocationNodeId,
          data: {
            label: `Location: ${data.phone_scan.location}`,
            type: "country-location",
            details: {
              value: "location info",
              description: [
                `Country Code: ${data.phone_scan.country_code}`,
                `Location: ${data.phone_scan.location}`,
              ].join("<br/>"),
            },
          },
          position: { x: 280, y: 160 },
          className: "bg-blue-500 text-white rounded-lg p-2 shadow-lg",
        });

        nodes.push({
          id: carrierFormatsNodeId,
          data: {
            label: `Carrier: ${data.phone_scan.carrier}`,
            type: "carrier-formats",
            details: {
              value: "carrier info",
              description: [
                `Carrier: ${data.phone_scan.carrier}`,
                `International Format: ${data.phone_scan.international_format}`,
                `Local Format: ${data.phone_scan.local_format}`,
              ].join("<br/>"),
            },
          },
          position: { x: 60, y: 180 },
          className: "bg-purple-500 text-white rounded-lg p-2 shadow-lg",
        });

        nodes.push({
          id: lineTypeNodeId,
          data: {
            label: `Line Type: ${data.phone_scan.line_type}`,
            type: "line-type",
            details: {
              value: "line type info",
              description: `Line Type: ${data.phone_scan.line_type}`,
            },
          },
          position: { x: -200, y: 200 },
          className: "bg-yellow-500 text-white rounded-lg p-2 shadow-lg",
        });

        nodes.push({
          id: validityNodeId,
          data: {
            label: `${data.phone_scan.valid ? "Valid" : "Invalid"}`,
            type: "validity",
            details: {
              value: "validity info",
              description: `Validity: ${
                data.phone_scan.valid ? "Valid" : "Invalid"
              }`,
            },
          },
          position: { x: 10, y: 60 },
          className: "bg-green-500 text-white rounded-lg p-2 shadow-lg",
        });

        // Create edges to link the nodes
        edges.push({
          id: `e-${userNodeId}-${validityNodeId}`,
          source: userNodeId,
          target: validityNodeId,
          animated: true,
        });
        if (isValid) {
          edges.push({
            id: `e-${validityNodeId}-${countryLocationNodeId}`,
            source: validityNodeId,
            target: countryLocationNodeId,
            animated: true,
          });
          edges.push({
            id: `e-${validityNodeId}-${carrierFormatsNodeId}`,
            source: validityNodeId,
            target: carrierFormatsNodeId,
            animated: true,
          });
          edges.push({
            id: `e-${validityNodeId}-${lineTypeNodeId}`,
            source: validityNodeId,
            target: lineTypeNodeId,
            animated: true,
          });
        }
      }
    }

    const usernameNodes = [];

    // Function to return site-specific icons
    function getIconForSite(site) {
      const icons = {
        GitHub:
          "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg",
        "GitHub Gist":
          "https://upload.wikimedia.org/wikipedia/commons/e/e1/Octicons-gist.svg",
        Freelancer:
          "https://upload.wikimedia.org/wikipedia/commons/f/f3/Logo_Freelancer.svg",
        Snapchat:
          "https://upload.wikimedia.org/wikipedia/commons/a/a6/Snapchat_Logo_2022.png",
        DeviantArt:
          "https://upload.wikimedia.org/wikipedia/commons/1/1d/DeviantArt_logo_2016.svg",
      };

      // Default icon if no specific match
      return (
        icons[site] ||
        "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg"
      );
    }

    if (data.username_scan && data.username_scan.length > 0) {
      console.log(data);
      data.username_scan.forEach((entry, index) => {
        const { site, url } = entry;
        const iconUrl = getIconForSite(site);
        const nodeId = `username-${userNodeId}-${index}`;
        console.log(site, url, iconUrl, nodeId, index);
        const totalNodes = data.username_scan.length;
    
        // Constants for layout
        const NODE_SPACING = 250; // Space between nodes
        const BASE_Y = 150; // Base vertical position
        const Y_OFFSET = 50; // Maximum height difference for the arc
    
        // Calculate horizontal position
        const START_X = -(((totalNodes - 1) * NODE_SPACING) / 2);
        const currentX = START_X + (index * NODE_SPACING);
    
        // Calculate vertical position using a parabolic function
        // This creates an arc effect where edges are higher than the center
        const normalizedPosition = (index / (totalNodes - 1)) * 2 - 1; // Range from -1 to 1
        const yOffset = Y_OFFSET * (normalizedPosition * normalizedPosition); // Parabolic function
        const currentY = BASE_Y - yOffset; // Subtract offset to move nodes up
    
        usernameNodes.push({
          id: nodeId,
          data: {
            label: `${site}`,
            type: "username-site",
            details: {
              value: url,
              description: `URL: 
              <a href="${url}" target="_blank" class="text-blue-500">${url}</a>
              `,
            },
            icon: iconUrl,
          },
          position: {
            x: currentX,
            y: currentY,
          },
          className:
            "bg-[#f87171] text-white rounded-lg p-2 shadow-lg flex items-center space-x-2",
        });
    
        nodes.push(...usernameNodes);
    
        edges.push({
          id: `edge-${userNodeId}-${nodeId}`,
          source: userNodeId,
          target: nodeId,
          animated: true,
        });
      });
    } else if (data.username_scan && data.username_scan.length === 0){
      console.log(data);
      usernameNodes.push({
        id: `${userNodeId}-empty`,
        data: {
          label: "No Username Data Found",
          type: "username-empty",
          details: { value: "No results found" },
          icon: "fas fa-exclamation-circle",
        },
        position: { x: NODE_SPACING, y: BASE_Y },
        className:
          "bg-gray-500 text-black rounded-lg p-2 shadow-lg flex items-center space-x-2",
      });
    
      nodes.push(...usernameNodes);
    
      edges.push({
        id: `edge-${userNodeId}-empty`,
        source: userNodeId,
        target: `${userNodeId}-empty`,
        animated: false,
      });
    }

    return { nodes, edges };
  };

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
