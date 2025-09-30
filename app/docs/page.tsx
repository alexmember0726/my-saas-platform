"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useEffect, useState } from "react";

export default function DocsPage() {
  const [spec, setSpec] = useState<any>(null);

  useEffect(() => {
    async function fetchSpec() {
      const res = await fetch("/api/docs");
      const data = await res.json();
      setSpec(data);
    }
    fetchSpec();
  }, []);

  if (!spec) {
    return <div className="p-4">Loading Swagger UI...</div>;
  }

  return <SwaggerUI spec={spec} />;
}
