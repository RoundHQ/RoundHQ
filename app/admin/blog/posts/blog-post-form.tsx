import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import type { BlogCategory, BlogPost } from "@/lib/blog";

type BlogPostFormProps = {
  action: (formData: FormData) => Promise<void>;
  categories: BlogCategory[];
  post?: BlogPost;
  mode: "create" | "edit";
  error?: string;
  saved?: boolean;
  deleteAction?: (formData: FormData) => Promise<void>;
};

function getDateTimeInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => part.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function TextInput({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
      />
    </label>
  );
}

export default function BlogPostForm({
  action,
  categories,
  post,
  mode,
  error,
  saved,
  deleteAction,
}: BlogPostFormProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
      {saved ? (
        <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Blog post saved.
        </div>
      ) : null}

      {error === "required" ? (
        <div className="mb-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          Title and body are required before saving a blog post.
        </div>
      ) : null}

      <form action={action} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput
            label="Post title"
            name="title"
            defaultValue={post?.title}
            placeholder="How to set up your first round"
            required
          />
          <TextInput
            label="Slug"
            name="slug"
            defaultValue={post?.slug}
            placeholder="how-to-set-up-your-first-round"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Category
            </span>
            <select
              name="category_id"
              defaultValue={post?.categoryId ?? ""}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
            >
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Status
            </span>
            <select
              name="status"
              defaultValue={post?.status ?? "draft"}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>

          <TextInput
            label="Published date"
            name="published_at"
            type="datetime-local"
            defaultValue={getDateTimeInputValue(post?.publishedAt)}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <TextInput
            label="Author"
            name="author_name"
            defaultValue={post?.authorName ?? "RoundHQ"}
          />
          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 md:mt-7">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={post?.isFeatured ?? false}
              className="size-4 accent-[#19c653]"
            />
            Feature this post on the blog index
          </label>
        </div>

        <TextArea
          label="Excerpt"
          name="excerpt"
          defaultValue={post?.excerpt}
          rows={3}
          placeholder="Short summary shown on cards and search previews."
        />

        <TextArea
          label="Body"
          name="body"
          defaultValue={post?.body}
          rows={13}
          placeholder="Write the update or guide. Use blank lines to split paragraphs."
          required
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-extrabold tracking-normal text-slate-950">
            Photo and video
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add a featured image URL and a YouTube, Vimeo, or direct embed URL
            for a video. The public post will render both when they are present.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <TextInput
              label="Featured image URL"
              name="featured_image_url"
              defaultValue={post?.featuredImageUrl}
              placeholder="https://..."
            />
            <TextInput
              label="Image alt text"
              name="featured_image_alt"
              defaultValue={post?.featuredImageAlt}
              placeholder="RoundHQ dashboard screenshot"
            />
            <TextInput
              label="Video embed URL"
              name="video_embed_url"
              defaultValue={post?.videoEmbedUrl}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <TextInput
              label="Video title"
              name="video_embed_title"
              defaultValue={post?.videoEmbedTitle}
              placeholder="RoundHQ setup walkthrough"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-extrabold tracking-normal text-slate-950">
            SEO
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <TextInput
              label="SEO title"
              name="seo_title"
              defaultValue={post?.seoTitle}
              placeholder="Optional, defaults to post title"
            />
            <TextInput
              label="SEO description"
              name="seo_description"
              defaultValue={post?.seoDescription}
              placeholder="Optional, defaults to excerpt"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861]"
          >
            <Save aria-hidden="true" className="size-4" />
            {mode === "create" ? "Create post" : "Save post"}
          </button>
          <Link
            href="/admin/blog"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to blog
          </Link>
        </div>
      </form>

      {deleteAction ? (
        <form action={deleteAction} className="mt-6 border-t border-slate-200 pt-6">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-5 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete post
          </button>
        </form>
      ) : null}
    </section>
  );
}
