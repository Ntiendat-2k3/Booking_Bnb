import { Riple } from "react-loading-indicators";

const RipleLoading = () => {
  return (
    <div className="flex items-center justify-center w-full min-h-screen">
      <Riple color="#cc31cc" size="large" text="..." textColor="" />
    </div>
  );
};

export default RipleLoading;
