import slugify from "slugify";

export const CLICopyPasta = ({ title }) => {
    const slug = slugify(title);

    return (
        <pre>{`
cd ~/Documents/websites/swizec.com
mkdir src/pages/blog/${slug}
mkdir src/pages/blog/${slug}/img
touch src/pages/blog/${slug}/index.mdx
            `}</pre>
    );
};
