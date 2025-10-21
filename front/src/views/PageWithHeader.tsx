import Header from './Header';

const PageWithHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default PageWithHeader;
