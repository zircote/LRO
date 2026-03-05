import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://zircote.com",
  base: "/LRO",
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
