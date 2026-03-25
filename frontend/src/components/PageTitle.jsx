import { useEffect } from "react";

const PageTitle = ({ title }) => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  return null;
};

export default PageTitle;
