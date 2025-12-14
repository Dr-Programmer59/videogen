import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar, PageType } from "@/components/Sidebar";
import { PreviewPanel } from "@/components/PreviewPanel";
import CharacterBuilder from "./CharacterBuilder";
import EnvironmentBuilder from "./EnvironmentBuilder";
import ImageToVideo from "./ImageToVideo";
import TextToVideo from "./TextToVideo";

const Index = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    const saved = localStorage.getItem("video-gen-last-page");
    return (saved as PageType) || "character-builder";
  });

  const [promptText, setPromptText] = useState("");
  const [promptParts, setPromptParts] = useState<Array<{ label: string; summary: string }>>([]);
  const [resultType, setResultType] = useState<"image" | "video" | null>(null);
  const [resultPlaceholder, setResultPlaceholder] = useState<string>("");
  const [status, setStatus] = useState<"ready" | "building" | "generated">("ready");

  useEffect(() => {
    localStorage.setItem("video-gen-last-page", currentPage);
  }, [currentPage]);

  const handlePromptBuilt = (prompt: string, parts: Array<{ label: string; summary: string }>) => {
    setStatus("building");
    setTimeout(() => {
      setPromptText(prompt);
      setPromptParts(parts);
      
      // Determine result type based on current page
      if (currentPage === "character-builder" || currentPage === "environment-builder") {
        setResultType("image");
      } else {
        setResultType("video");
      }
      
      setStatus("ready");
    }, 500);
  };

  const handleGenerate = () => {
    setStatus("generated");
    setResultPlaceholder("generated-" + Date.now());
  };

  const handleClear = () => {
    setPromptText("");
    setPromptParts([]);
    setResultType(null);
    setResultPlaceholder("");
    setStatus("ready");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "character-builder":
        return <CharacterBuilder onPromptBuilt={handlePromptBuilt} onGenerate={handleGenerate} />;
      case "environment-builder":
        return <EnvironmentBuilder onPromptBuilt={handlePromptBuilt} onGenerate={handleGenerate} />;
      case "image-to-video":
        return <ImageToVideo onPromptBuilt={handlePromptBuilt} onGenerate={handleGenerate} />;
      case "text-to-video":
        return <TextToVideo onPromptBuilt={handlePromptBuilt} onGenerate={handleGenerate} />;
      case "ai-storyboard":
        // Navigate to the full-page storyboard wizard
        navigate("/storyboard");
        return null;
      case "ai-influencer":
        // Navigate to the full-page AI influencer creator
        navigate("/ai-influencer");
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar currentPage={currentPage} onPageChange={(page) => {
        if (page === "ai-storyboard") {
          navigate("/storyboard");
        } else if (page === "ai-influencer") {
          navigate("/ai-influencer");
        } else {
          setCurrentPage(page);
        }
      }} />
      
      <main className="flex-1 overflow-y-auto p-8">
        {renderPage()}
      </main>

      <PreviewPanel
        promptText={promptText}
        promptParts={promptParts}
        resultType={resultType}
        resultPlaceholder={resultPlaceholder}
        status={status}
        onClear={handleClear}
      />
    </div>
  );
};

export default Index;
