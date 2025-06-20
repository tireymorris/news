const EnableDarkMode = () => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            document.documentElement.classList.add('dark');
          })();
        `,
      }}
    />
  );
};

export default EnableDarkMode;
