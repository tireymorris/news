import { z } from "zod";

const articleSchema = z.object({
  title: z
    .string()
    .refine((title) => title.split(" ").length >= 7, {
      message: "Title must contain at least 7 words",
    })
    .refine(
      (title) =>
        !["Video Duration", "play", "play-inverse"].some((prefix) =>
          title.startsWith(prefix),
        ),
      {
        message: "Title starts with an invalid prefix",
      },
    ),
  link: z.string().url(),
  source: z.string(),
});

export default articleSchema;
