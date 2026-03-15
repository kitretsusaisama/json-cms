export default {
  name: "page",
  fields: [
    { name: "title", type: "string", required: true },
    { name: "slug", type: "string", required: true },
    { name: "content", type: "richtext" }
  ]
} as const;
