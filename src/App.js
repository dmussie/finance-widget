import StockQuote from "./StockQuote";

function App(props) {

  return (
    <div>
      <StockQuote symbol={props.symbol}/>
    </div>
  );
}

export default App;