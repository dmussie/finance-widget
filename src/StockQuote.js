import React, {useState, useEffect} from 'react';
import moment from 'moment';
import axiosInstance from '.';

const MARKET_STACK_QUOTE_URL = `${process.env.REACT_APP_MARKETSTACK_BASE_URL}/intraday`;
const MARKET_STACK_TICKER_URL = `${process.env.REACT_APP_MARKETSTACK_BASE_URL}/tickers`;

function StockQuote(props) {
    console.log('props: ' + JSON.stringify(props));
    const [quote, setQuote] = useState({
        price: '--',
        var: '--',
        time: '--'
    });
    const [stock, setStock] = useState({
        stockExchange: 'N/A',
        name: 'N/A',
    });

    const fetchWithRetry = async (url, params, retries = 3, delay = 1000) => {
        try {
            const response = await axiosInstance.get(url, { params });
            return response.data;
        } catch (error) {
            if (error.response?.status === 429 && retries > 0) {
                console.warn('Rate limited, retrying...');
                await new Promise((resolve) => setTimeout(resolve, delay));
                return fetchWithRetry(url, params, retries - 1, delay * 2); // Exponential backoff
            }
            throw error; // Rethrow if not a 429 or no retries left
        }
    };
    
    useEffect(() => {
        fetchWithRetry(MARKET_STACK_QUOTE_URL, {
            access_key: process.env.REACT_APP_MARKETSTACK_ACCESS_KEY,
            symbols: props.symbol,
            interval: '15min',
            date_from: moment().subtract(1, 'day').format('YYYY-MM-DD'),
            date_to: moment().format('YYYY-MM-DD'),
            limit: '1',
        })
        .then((data) => {
            // Process data
            // Check if the API response contains the expected data
            if (!data?.data || data.data.length === 0) {
                console.warn('No data returned from the API.');
                return;
            }

            // Extract the latest quote
            const lastQuote = data.data[0];
            setQuote({
                price: lastQuote.last, // Latest price
                var: Math.trunc(-(1 - (lastQuote.last / lastQuote.open)) * 10000) / 100, // Variation
                time: moment(lastQuote.date).format('YYYY-MM-DD HH:mm'), // Formatted time
            });
        })
        .catch((error) => {
            console.error('API call failed:', error);
            setQuote({
                price: '--', // Placeholder for error state
                var: '--',
                time: '--',
            });
        });
    }, [props.symbol]);
    
    useEffect(() => {
        fetchWithRetry(MARKET_STACK_TICKER_URL, {
            access_key: process.env.REACT_APP_MARKETSTACK_ACCESS_KEY,
        })
        .then((data) => {
            console.log('API Response:', data); // Debugging
            if (!data?.data || data.data.length === 0) {
                console.warn('No data returned from the API.');
                return;
            }

            data.data.forEach((item) => {
                if (item?.stock_exchange?.acronym) {
                    console.log('Acronym:', item.stock_exchange.acronym);
                    setStock({
                        stockExchange: item?.stock_exchange?.acronym || 'N/A', // Fallback for missing acronym
                        name: item?.stock_exchange?.name || 'Unknown' // Fallback for missing name
                    });
                }
            });
            
        })
        .catch((error) => {
            console.error('API Error:', error); // Log any errors for debugging
        });
    });

    const varColor = quote.var < 0 ? 'text-red-500' : 'text-green-500';

    console.log(props.symbol);
    console.log(stock.name);
    console.log(stock.stockExchange);

    return (
        <div className={'quote rounded-lg shadow-md p-4 bg-gray-800'}>
            <span className={'quoteSymbol text-sm text-white font-bold'}>{props.symbol}</span>
            <span className={'quoteSymbol text-2xs text-gray-400 ml-1'}>{stock.name}</span>
            <span className={'quoteSymbol text-2xs text-gray-400 ml-1'}>({stock.stockExchange})</span>
            <div className={'quote flex flex-row justify-between mt-1'}>
                <div className={'quotePrice self-center text-2xl font-bold items-center text-white'}>${quote.price}</div>
                <div className={'flex flex-col text-right'}>
                    <div className={'quoteVar ' + varColor}>{quote.var}%</div>
                    <div className={'quoteTime text-right text-2xs text-gray-400'}>{quote.time}</div>
                </div>
            </div>
        </div>
    );
}

export default StockQuote;