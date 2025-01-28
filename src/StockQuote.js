import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import axiosInstance from '.';

const MARKET_STACK_QUOTE_URL = `${process.env.REACT_APP_MARKETSTACK_BASE_URL}/intraday`;
const MARKET_STACK_TICKER_URL = `${process.env.REACT_APP_MARKETSTACK_BASE_URL}/tickers`;

function StockQuote(props) {
    const [quote, setQuote] = useState({
        price: '--',
        var: '--',
        time: '--',
    });
    const [stock, setStock] = useState({
        stockExchange: 'N/A',
        name: 'N/A',
    });

    const fetchWithRetry = useCallback(async (url, params, retries = 3, delay = 1000) => {
        try {
            const response = await axiosInstance.get(url, { params });
            return response.data;
        } catch (error) {
            console.error('Error in fetchWithRetry:', error);
            if (error.response?.status === 429 && retries > 0) {
                console.warn('Rate limited, retrying...');
                await new Promise((resolve) => setTimeout(resolve, delay));
                return fetchWithRetry(url, params, retries - 1, delay * 2); // Exponential backoff
            }
            throw error; // Rethrow if not a 429 or no retries left
        }
    }, []);

    useEffect(() => {
        // First, fetch ticker data
        fetchWithRetry(MARKET_STACK_TICKER_URL, {
            access_key: process.env.REACT_APP_MARKETSTACK_ACCESS_KEY,
        })
            .then((result) => {
                console.log('API Response: ', result);
                if (!result?.data || result.data.length === 0) {
                    console.warn('No ticker data returned from the API.');
                    return;
                }

                // Find the matching stock info for the provided symbol
                const matchingStock = result.data.find((item) => item.symbol === props.symbol);
                if (matchingStock) {
                    setStock({
                        stockExchange: matchingStock.stock_exchange.acronym || 'N/A',
                        name: matchingStock.name || 'Unknown',
                    });

                    // Fetch the quote data for the matching symbol
                    return fetchWithRetry(MARKET_STACK_QUOTE_URL, {
                        access_key: process.env.REACT_APP_MARKETSTACK_ACCESS_KEY,
                        symbols: props.symbol,
                        interval: '15min',
                        date_from: moment().subtract(1, 'day').format('YYYY-MM-DD'),
                        date_to: moment().format('YYYY-MM-DD'),
                        limit: '1',
                    });
                } else {
                    console.warn(`No stock found for symbol: ${props.symbol}`);
                    return null;
                }
            })
            .then((quoteData) => {
                if (!quoteData?.data || quoteData.data.length === 0) {
                    console.warn('No quote data returned from the API.');
                    return;
                }

                // Extract the latest quote
                const lastQuote = quoteData.data[0];
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
    }, [props.symbol, fetchWithRetry]);

    const varColor = quote.var < 0 ? 'text-red-500' : 'text-green-500';

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