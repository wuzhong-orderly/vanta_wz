export const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <style>
      {`
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.03);
        }
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-left-color: #09f;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}
    </style>
  </div>
);

