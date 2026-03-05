import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import rehypeMermaid from "rehype-mermaid";

export default defineConfig({
  site: "https://zircote.com",
  base: "/LRO",
  markdown: {
    rehypePlugins: [[rehypeMermaid, { strategy: "img-svg" }]],
  },
  integrations: [
    starlight({
      title: "LRO Paper",
      description:
        "Large Result Offloading: Demand-Driven Context Management for Tool-Augmented Language Models",
      social: [
        {
          label: "GitHub",
          icon: "github",
          href: "https://github.com/zircote/LRO",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/zircote/LRO/edit/main/",
      },
      sidebar: [
        { label: "Home", slug: "" },
        {
          label: "Paper",
          items: [
            { label: "Full Paper", slug: "paper" },
            { label: "Specification", slug: "paper/specification" },
          ],
        },
        { label: "Contributing", slug: "contributing" },
      ],
    }),
  ],
});
