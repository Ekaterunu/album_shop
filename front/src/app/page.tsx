"use client";

import React, { useState, useEffect, FormEvent, useRef, ChangeEvent } from "react";

import { ethers } from "ethers";
import { MusicShop__factory } from "@/typechain";
import type { MusicShop } from "@/typechain";
import type { BrowserProvider } from "ethers";
import { Howl } from 'howler';

import ConnectWallet from "@/components/ConnectWallet";
import WaitingForTransactionMessage from "@/components/WaitingForTransactionMessage";
import TransactionErrorMessage from "@/components/TransactionErrorMessage";
import AudioPlayer from '../components/AudioPlayer';
import { connection } from "next/server";

//1337
const HARDHAT_NETWORK_ID = "11155111";
//контракт
const MUSIC_SHOP_ADDRESS = "0x76c0d6C2ACe2B292B3AC9F938E4F39d0AB4EF44c";

declare let window: any;

type CurrentConnectionProps = {
  provider: BrowserProvider | undefined;
  shop: MusicShop | undefined;
  signer: ethers.JsonRpcSigner | undefined;
};

type AlbumProps = {
  index: ethers.BigNumberish;
  uid: string;
  title: string;
  executor: string;
  price: ethers.BigNumberish;
  quantity: ethers.BigNumberish;
  image: string;
  songs: string;
};

export default function Home() {
  const [boughtAlbums, setBoughtAlbums] = useState<AlbumProps[]>([]); // для купленных альбомов
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).map((file) => {
        const fileNameWithoutExtension = file.name.split('.').slice(0, -1).join('.');
        return fileNameWithoutExtension;
      });
      setSelectedFiles(files);
    }
  };
  const handleFileSubmit = () => {
    setSelectedFiles([]);
  };


  const [networkError, setNetworkError] = useState<string>();
  const [txBeingSent, setTxBeingSent] = useState<string>();
  const [transactionError, setTransactionError] = useState<any>();
  const [currentBalance, setCurrentBalance] = useState<string>();
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [albums, setAlbums] = useState<AlbumProps[]>([]);
  const [currentConnection, setCurrentConnection] =
    useState<CurrentConnectionProps>();

  useEffect(() => {
    (async () => {
      if (currentConnection?.provider && currentConnection.signer) {
        setCurrentBalance(
          (
            await currentConnection.provider.getBalance(
              currentConnection.signer.address,
              await currentConnection.provider.getBlockNumber(),
            )
          ).toString()
        );
      }
    })();
  }, [currentConnection, txBeingSent]);

  useEffect(() => {
    (async () => {
      if (currentConnection?.shop && currentConnection.signer) {
        const newAlbums = (await currentConnection.shop.allAlbums()).map(
          (album): AlbumProps => {
            return {
              index: album[0].toString(),
              uid: album[1],
              title: album[2],
              executor: album[3],
              price: album[4],
              quantity: album[5],
              image: album[6],
              songs: album[7]
            };
          }
        );

        setAlbums((albums) => [...albums, ...newAlbums]);

        setIsOwner(
          ethers.getAddress(await currentConnection.shop.owner()) ===
          (await currentConnection.signer.getAddress())
        );
      }
    })();
  }, [currentConnection]);

  const _connectWallet = async () => {
    // проверка установлен ли метамаск
    if (window.ethereum === undefined) {
      setNetworkError("Please install Metamask!");

      return;
    }
    // проверка сети
    if (!(await _checkNetwork())) {
      return;
    }

    const [selectedAccount] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    await _initialize(ethers.getAddress(selectedAccount));

    window.ethereum.on(
      "accountsChanged",
      async ([newAccount]: [newAccount: string]) => {
        if (newAccount === undefined) {
          return _resetState();
        }
        _resetState();
        await _initialize(ethers.getAddress(newAccount));
      }
    );

    window.ethereum.on("chainChanged", ([_networkId]: any) => {
      _resetState();
    });
  };

  const _initialize = async (selectedAccount: string) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner(selectedAccount);

    setCurrentConnection({
      ...currentConnection,
      provider,
      signer,
      shop: MusicShop__factory.connect(MUSIC_SHOP_ADDRESS, signer),
    });
  };
  // 
  const _checkNetwork = async (): Promise<boolean> => {
    const chosenChainId = await window.ethereum.request({
      method: "eth_chainId",
    });
    ///////
    //const chainId = await window.ethereum.send("eth_chainId");
    //console.log(`Hex Chain ID: ${chainId}`);
    //setNetworkError(`Hex Chain ID: ${chainId}`);
    ///////

    //if (chosenChainId === HARDHAT_NETWORK_ID) {
    return true;
    //}
    //setNetworkError("Please connect to Hardhat network sepolia!");
    //return false;
  };

  const _resetState = () => {
    setNetworkError(undefined);
    setTransactionError(undefined);
    setTxBeingSent(undefined);
    setCurrentBalance(undefined);
    setIsOwner(false);
    setAlbums([]);
    setCurrentConnection({
      provider: undefined,
      signer: undefined,
      shop: undefined,
    });
    setBoughtAlbums([]);
  };

  const _dismissNetworkError = () => {
    setNetworkError(undefined);
  };

  const _dismissTransactionError = () => {
    setTransactionError(undefined);
  };

  const _getRpcErrorMessage = (error: any): string => {
    console.log(error);
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  };

  const isSafeImageUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const allowedProtocols = ['https:', 'http:'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

      return (
        allowedProtocols.includes(parsed.protocol) &&
        allowedExtensions.some(ext => parsed.pathname.toLowerCase().endsWith(ext))
      );
    } catch {
      return false;
    }
  };

  const _handleAddAlbum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentConnection?.shop) {
      return false;
    }

    const shop = currentConnection.shop;
    const formData = new FormData(event.currentTarget);

    const title = formData.get("albumTitle")?.toString();
    const executor = formData.get("albumExecutor")?.toString();
    const price = formData.get("albumPrice")?.toString();
    const quantity = formData.get("albumQty")?.toString();
    const image = formData.get("albumImage")?.toString();
    const songs = formData.get("albumSongs")?.toString();


    if (title && executor && price && quantity && image && songs) {
      const safeTextRegex = /^[a-zA-Z0-9а-яА-ЯёЁ\s.,!?-]{1,100}$/;

      if (!safeTextRegex.test(title)) {
        alert("Название альбома содержит недопустимые символы.");
        return;
      }

      if (!safeTextRegex.test(executor)) {
        alert("Имя исполнителя содержит недопустимые символы.");
        return;
      }

      const priceBigInt = BigInt(price);
      const quantityBigInt = BigInt(quantity);

      if (priceBigInt <= 0 || quantityBigInt <= 0) {
        alert("Цена и количество должны быть больше нуля.");
        return;
      }
      if (!isSafeImageUrl(image)) {
        alert("Некорректный URL изображения.");
        return;
      }
      const uid = ethers.solidityPackedKeccak256(["string"], [title]);

      try {
        const index = await shop.currentIndex();

        const addTx = await shop.addAlbum(
          uid,
          title,
          executor,
          BigInt(price),
          BigInt(quantity),
          image,
          songs
        );

        setTxBeingSent(addTx.hash);

        await addTx.wait();

        setAlbums((albums) => [
          ...albums,
          {
            index,
            uid,
            title,
            executor,
            price,
            quantity,
            image,
            songs,
          },
        ]);
        handleFileSubmit();
      } catch (err) {
        console.error(err);

        setTransactionError(err);
      } finally {
        setTxBeingSent(undefined);
      }
    }
  };
  const _handleUpdateAlbum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentConnection?.shop) {
      return false;
    }

    const shop = currentConnection.shop;
    const formData = new FormData(event.currentTarget);

    // значения из формы
    const albumIndex = formData.get("albumIndex")?.toString();
    const title = formData.get("albumTitle")?.toString();
    const executor = formData.get("albumExecutor")?.toString();
    const price = formData.get("albumPrice")?.toString();
    const quantity = formData.get("albumQty")?.toString();
    const image = formData.get("albumImage")?.toString();
    const songs = formData.get("albumSongs")?.toString();

    // проверка на наличие
    if (title && executor && price && quantity && image && songs && albumIndex) {
      const safeTextRegex = /^[a-zA-Z0-9а-яА-ЯёЁ\s.,!?-]{1,100}$/;

      if (!safeTextRegex.test(title)) {
        alert("Название альбома содержит недопустимые символы.");
        return;
      }

      if (!safeTextRegex.test(executor)) {
        alert("Имя исполнителя содержит недопустимые символы.");
        return;
      }

      const priceBigInt = BigInt(price);
      const quantityBigInt = BigInt(quantity);
      const albumIndexBigInt = BigInt(albumIndex);

      if (albumIndexBigInt < 0) {
        alert("Индекс должны быть не меньше нуля.");
        return;
      }
      if (priceBigInt <= 0 || quantityBigInt <= 0 || albumIndexBigInt < 0) {
        alert("Цена и количество должны быть больше нуля.");
        return;
      }
      if (!isSafeImageUrl(image)) {
        alert("Некорректный URL изображения.");
        return;
      }
      try {
        
        const indexBigInt = BigInt(albumIndex);

        const updateTx = await shop.updateAlbum(
          indexBigInt,                
          BigInt(price),              
          BigInt(quantity),           
          title,                      
          executor,                   
          image,                      
          songs                       
        );

        setTxBeingSent(updateTx.hash);

        await updateTx.wait();

        setAlbums((albums) => {
          const updatedAlbums = albums.map((album) =>
            album.index === indexBigInt
              ? { ...album, title, executor, price, quantity, image, songs }
              : album
          );
          return updatedAlbums;
        });

        handleFileSubmit();
      } catch (err) {
        console.error(err);
        setTransactionError(err);
      } finally {
        setTxBeingSent(undefined);
      }
    } else {
      console.error("Missing required fields.");
    }
  };

  const _handleDeleteAlbum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentConnection?.shop) {
      return false;
    }

    const shop = currentConnection.shop;
    const formData = new FormData(event.currentTarget);

    // индекс альбома из формы
    const albumIndex = formData.get("albumIndexToDelete")?.toString();

    // проверка  существует ли
    if (albumIndex) {
      const albumIndexBigInt = BigInt(albumIndex);

      if (albumIndexBigInt < 0) {
        alert("Индекс должны быть не меньше нуля.");
        return;
      }
      try {
        const indexBigInt = BigInt(albumIndex);

        // удаляем альбом через смарт-контракт
        const deleteTx = await shop.deleteAlbum(indexBigInt);

        setTxBeingSent(deleteTx.hash);

        await deleteTx.wait();

        setAlbums((albums) => {
          // удаляем альбом из локального списка альбомов
          return albums.filter((album) => album.index !== indexBigInt);
        });

        console.log("Album deleted successfully.");
      } catch (err) {
        console.error("Error deleting album:", err);
        setTransactionError(err);
      } finally {
        setTxBeingSent(undefined);
      }
    } else {
      console.error("Album index is required.");
    }
  };
  const _handleBuyAlbum = async (
    album: AlbumProps,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();

    if (!currentConnection?.shop) {
      return false;
    }

    try {
      const buyTx = await currentConnection.shop.buy(album.index, { value: album.price });
      setTxBeingSent(buyTx.hash);
      await buyTx.wait();

      setAlbums(
        albums.map((a) => {
          if (a.index === album.index) {
            album.quantity =
              BigInt(album.quantity) - BigInt(1);
            return album;
          } else {
            return a;
          }
        })
      );
    } catch (err) {
      console.error(err);

      setTransactionError(err);
    } finally {
      setTxBeingSent(undefined);
    }
  };


  const availableAlbums = () => {
    const albumsList = albums.map((album) => {
      return (

        <div key={album.uid} className="AlbumCard  h-auto max-w-full ">

          <div className="flex">
            <div className="PartAlbumCard">
              <div className="CircAlbumCard"><img className="imgAlbumCard" src={album.image.toString()} alt="Album Cover" /></div>
            </div>

            <div className="TextAlbumCard">
              <p className="titleAlbumTitle"> {album.title}
              </p>
              <p className="titleAlbumExecutor executor">
                {album.executor} </p>
              {isOwner && (
                <p className="index "> Index {album.index.toString()}</p>
              )}
              <div className="line_164"></div>
              <div className="TextCountAndAmount">
                <p className="TextCount">
                  В наличии : {album.quantity.toString()} шт.
                </p>
                <p className="TextAmount">
                  Цена: {album.price.toString()} wai
                </p>
              </div>


              {BigInt(album.quantity) > BigInt(0) && (
                <div className="">
                  <button onClick={(e) => _handleBuyAlbum(album, e)}
                    className="ShopBuy transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none shadow-gray-900/10 hover:shadow-gray-900/20 focus:opacity-[0.85] active:opacity-[0.85] active:shadow-none block w-full bg-blue-gray-900/10 text-blue-gray-900 shadow-none hover:scale-105 hover:shadow-none focus:scale-105 focus:shadow-none active:scale-100"
                    type="button">

                  </button>
                </div>
              )}

            </div>
          </div>
        </div >

      );
    });

    return albumsList;
  };

  // функция для получения купленных альбомов////////////////////////////////////////////////////////
  const fetchBoughtAlbums = async (address: string) => {
    if (!currentConnection?.shop) return;

    try {
     
      const albumsBought = await currentConnection.shop.getAlbumsBoughtBy(address);

      const boughtAlbumsData = albumsBought.map((albumMy: any) => {
        return {
          index: albumMy[0].toString(),
          uid: albumMy[1],
          title: albumMy[2],
          executor: albumMy[3],
          price: albumMy[4],
          quantity: albumMy[5],
          image: albumMy[6],
          songs: albumMy[7]
        };
      });

      setBoughtAlbums(boughtAlbumsData); // обновляем состояние купленных альбомов
    } catch (error) {
      console.error("Error fetching bought albums:", error);
    }
  };

  // вызываем fetchBoughtAlbums после подключения кошелька и получения адреса
  useEffect(() => {
    (async () => {
      if (currentConnection?.provider && currentConnection.signer) {
        if (currentConnection?.signer) {
          currentConnection.signer.getAddress().then((address: string) => {
            fetchBoughtAlbums(address); // получаем купленные альбомы для текущего адреса
          });
        }
      }
    })();
  }, [currentConnection?.signer]);

  // функция для отображения альбомов
  const renderAlbums = (albumsToRender: AlbumProps[]) => {
    return albumsToRender.map((album) => {
      return (
        <div key={album.uid}>  
          <div className="flex">
            <div className="PartAlbumCard" >
              <div className="CircAlbumCard">
                <img className="imgAlbumCard" src={album.image.toString()} alt="Album Cover" />
              </div>
            </div>

            <div className="TextAlbumCard">
              <p className="titleAlbumTitle">{album.title}</p>
              <p className="titleAlbumExecutor executor">{album.executor}</p>
              {isOwner && (
                <p className="index "> Index {album.index.toString()}</p>
              )}
              <div className="line_164 mb-4"></div>

              <ul>
                {album.songs.split(',').map((songMy, indexMy) => (
                  <li key={indexMy}>
                    <div className="song">
                      <p>{songMy.trim()}</p>
                      <div className="songDiv butSongDiv">
                        <AudioPlayer
                          executorName={album.executor}
                          albumName={album.title}
                          audioFileName={songMy.trim()}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

            </div>
          </div>
        </div>
      );
    });


  };

  interface Album {
    index: ethers.BigNumberish;
    uid: string;
    title: string;
    executor: string;
    price: ethers.BigNumberish;
    quantity: ethers.BigNumberish;
    image: string;
    songs: string;
  }
  const lenAlbum = albums.length;// количество всего альбомов

  const Page = () => {
    const [pageNumber, setPageNumber] = useState(1);
    const [albums, setAlbums] = useState<Album[]>([]); // Album[]
    const fetchAlbumsByPage = async (page: number) => {
      if (currentConnection?.shop && currentConnection.signer) {
        const newAlbums = (await currentConnection.shop.getAlbumsByPage(page)).map(
          (album) => {
            return {
              index: album.index,
              uid: album.uid,
              title: album.title,
              executor: album.executor,
              price: album.price,
              quantity: album.quantity,
              image: album.image,
              songs: album.songs
            };
          }
        );
        setAlbums(newAlbums);
      }
    };

    useEffect(() => {
      fetchAlbumsByPage(pageNumber);
    }, [pageNumber, currentConnection?.signer]);

    const handlePageClick = (newPage: number) => {

      if (newPage >= 1) {
        if (newPage <= lenAlbum) {
          setPageNumber(newPage);
        } else {
          newPage = 1
          setPageNumber(newPage);
        }
      }

    };
    const songsArray = albums.map((album) => (album.songs.split(',').map(song => song.trim())));

    return (
      <div >


        {currentConnection?.signer && (

          <div>

            {/*<div>Current Page: {pageNumber}</div>*/}
            <div>
              {albums.map((album) => (
                <div className="elementAlbum2" key={album.uid}>
                  <ul className="ulAlbum2">
                    <li className="nth-child1">
                      <div>
                        <ul>
                          {songsArray.map((songs, index) => (
                            <li key={index}>
                              {songs.map((song, i) => (
                                <span key={i}>
                                  <div className="song">
                                    <p className="songDiv">
                                      {song}
                                    </p>
                                    <div className="songDiv butSongDiv">
                                      <AudioPlayer executorName={album.executor} albumName={album.title} audioFileName={song} />
                                    </div>
                                  </div>
                                </span>
                              ))}
                            </li>
                          ))}
                        </ul>
                      </div>

                    </li>
                    <li className="nth-child2">
                      <img className="imgAlbum" src={album.image} alt={album.title} />
                    </li>
                    <li className="nth-child3"><div className="cd-disk"></div>   </li>
                    <li className="nth-child4">
                      <div className="imgButtonBack transition-all  disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-xs py-3 px-6 rounded-lg shadow-gray-900/10 hover:shadow-gray-900/20 focus:opacity-[0.85] active:opacity-[0.85] active:shadow-none block w-full bg-blue-gray-900/10 text-blue-gray-900 shadow-none hover:scale-105 hover:shadow-none focus:scale-105 focus:shadow-none active:scale-100">
                        <button className="buttonBack"
                          onClick={() => handlePageClick(pageNumber - 1)}></button>
                      </div>
                    </li>
                    <li className="nth-child5">
                      <div className="Grid4">
                        <p className=" tit-exe-base text-neutral-200"> {album.title} </p>
                        <p className=" tit-exe-base text-neutral-200 executor"> {album.executor}</p>
                        <div className="line">  </div>
                        <div className="elemgrid4">
                          <div className="elemgrid4_11">
                            <p className="text- text-neutral-200">
                              В наличии: {album.quantity.toString()} шт.</p>
                            <p className="text-neutral-200">
                              Цена: {album.price.toString()} wei</p>
                          </div>
                          {BigInt(album.quantity) > BigInt(0) && (
                            <div className="elemgrid4_12 ">
                              <button onClick={(e) => _handleBuyAlbum(album, e)}
                                className="image-button-buy-bg align-middle select-none font-sans font-bold text-center uppercase transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-xs py-3 px-6 rounded-lg shadow-gray-900/10 hover:shadow-gray-900/20 focus:opacity-[0.85] active:opacity-[0.85] active:shadow-none block w-full bg-blue-gray-900/10 text-blue-gray-900 shadow-none hover:scale-105 hover:shadow-none focus:scale-105 focus:shadow-none active:scale-100"
                                type="button">
                                <div className="image-button-buy "> <p className="button-buy-p">купить</p></div>

                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                    <li className="nth-child6">                      <div className="imgButtonNext2 transition-all  disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-xs py-3 px-6 rounded-lg shadow-gray-900/10 hover:shadow-gray-900/20 focus:opacity-[0.85] active:opacity-[0.85] active:shadow-none block w-full bg-blue-gray-900/10 text-blue-gray-900 shadow-none hover:scale-105 hover:shadow-none focus:scale-105 focus:shadow-none active:scale-100">
                      <button className=" buttonNext2" onClick={() => handlePageClick(pageNumber + 1)}>
                      </button>
                    </div></li>


                  </ul>

                </div>
              ))}
            </div>
            {/* ... 
            <div className="buttonNext">
                <button  onClick={() => handlePageClick(pageNumber + 1)}>Next</button>
            </div>*/}
          </div>
        )}
      </div>
    );
  };


  return (
    <main>

      {!currentConnection?.signer && (
        <ConnectWallet
          connectWallet={_connectWallet}
          networkError={networkError}
          dismiss={_dismissNetworkError}
        />
      )}

      {txBeingSent && <WaitingForTransactionMessage txHash={txBeingSent} />}

      {transactionError && (
        <TransactionErrorMessage
          message={_getRpcErrorMessage(transactionError)}
          dismiss={_dismissTransactionError}
        />
      )}

      {currentConnection?.signer && (

        <header id="header">
          <div>

          </div>

          <div className="navbar">

            <input type="checkbox" id="burger-checkbox" className="burger-checkbox" />
            <label htmlFor="burger-checkbox" className="burger"></label>
            <ul className="menu">
              <li>
                <a href="#slider" className="menu-item">АЛЬБОМЫ</a>
              </li>
              <li>
                <a href="#albums" className="menu-item">КАТАЛОГ</a>
              </li>
              {isOwner && !txBeingSent && (<li>
                <a href="#add-album" className="menu-item">Редактор</a> </li>)}
              <li>
                <a href="#" className="menu-item">+7 (901) 123 45 67</a>
              </li>

            </ul>
          </div>

          <div className="YourData uppercase">
            <div className="block font-sans text-lg font-normal leading-snug tracking-normal">
              {currentConnection?.signer && (
                <div className="InfoData"><p className="mt-10 text-5xl titleAlbum pr-8">Ваш адрес </p><p className="mt-10 text-4xl">{currentConnection.signer.address}</p></div>
              )}
              {currentBalance && (
                <div className="InfoData"><p className="mt-10 text-5xl titleAlbum pr-4">Ваш баланс </p><p className="mt-10 text-4xl ">{ethers.formatEther(currentBalance)} ETH</p></div>
              )}
            </div>
          </div>
        </header>)}

      <section id="slider">
        <div >{Page()}</div>
      </section>

      <div className="relative">
        <section id="albums">
          {currentConnection?.signer && (
            <div className=" pt-16 w-11/12 allAlbum">
              <h4 className="titleAlbum  pb-8 ">Альбомы</h4>
              <div className="gridAlbum grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-3">
                {availableAlbums()}
              </div>
            </div>)}
        </section>
        <section id="add-album">
          {isOwner && !txBeingSent && (
            <div>
              <h4 className="titleAlbum titleAlbumAdd text-7xl pt-20 block antialiased font-semibold leading-snug tracking-normal text-neutral-200">
                Добавление альбома
              </h4>
            </div>)}
          <div className="p-8 addDiv">
            {isOwner && !txBeingSent && (
              <div>
                <div className="max-w-full flex flex-col text-neutral-300">

                  <form className="p-8 max-w-full mb-2 sm:w-auto" onSubmit={_handleAddAlbum}>
                    <div className="grid lg:grid-cols-2 gap-6 xs:grid-cols-1">

                      <div className="flex flex-col gap-6 mb-1 w-full">
                        <h6 className="custom-h6">
                          Альбом
                        </h6>
                        <div className="relative h-11 w-full min-w-[200px]">
                          <input type="text" name="albumTitle" placeholder="наименование альбома"
                            className="custom-input peer transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" />
                          <label className="before:content[' '] after:content[' '] pointer-events-none absolute left-0 -top-1.5 flex h-full w-full select-none !overflow-visible truncate text-[11px] font-normal leading-tight text-neutral-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:leading-[4.1] peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-neutral-200"></label>
                        </div>

                        <h6 className="custom-h6">
                          Исполнитель
                        </h6>
                        <div className="relative h-11 w-full min-w-[200px]">
                          <input type="text" name="albumExecutor" placeholder="наименование исполнителя"
                            className="custom-input peer  transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" />
                          <label className="before:content[' '] after:content[' '] pointer-events-none absolute left-0 -top-1.5 flex h-full w-full select-none !overflow-visible truncate text-[11px] font-normal leading-tight text-neutral-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:leading-[4.1] peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-neutral-200"></label>
                        </div>

                        <h6 className="custom-h6">
                          Цена
                        </h6>
                        <div className="relative h-11 w-full min-w-[200px]">
                          <input type="number" name="albumPrice" placeholder="wai"
                            className="custom-input peer  transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" />
                          <label className="before:content[' '] after:content[' '] pointer-events-none absolute left-0 -top-1.5 flex h-full w-full select-none !overflow-visible truncate text-[11px] font-normal leading-tight text-neutral-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:leading-[4.1] peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-neutral-200"></label>
                        </div>

                        <h6 className="custom-h6">
                          Количество
                        </h6>
                        <div className="relative h-11 w-full min-w-[200px]">
                          <input type="number" name="albumQty" placeholder="шт."
                            className="custom-input peer  transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" />
                          <label className="before:content[' '] after:content[' '] pointer-events-none absolute left-0 -top-1.5 flex h-full w-full select-none !overflow-visible truncate text-[11px] font-normal leading-tight text-neutral-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:leading-[4.1] peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-neutral-200"></label>
                        </div>
                      </div>

                      <div className="flex flex-col gap-6 mb-1 sm:col-span-1">
                        <h6 className="custom-h6">
                          Изображение
                        </h6>
                        <div>
                          <textarea name="albumImage" placeholder="наименование"
                            className="custom-input peer  transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" id="multilineInput"></textarea>
                          <label></label>
                        </div>

                        <div>
                          <h6 className="custom-h6">
                            Выберите песни альбома:
                          </h6>
                          <div className="mt-6">
                            <input className="button font-sans text-base antialiased font-sm" type="file" id="fileInput" name="files" multiple onChange={handleFileChange} />
                            <textarea name="albumSongs" placeholder="наименование"
                              className="mt-6 custom-input peer  transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" id="multilineInput"
                              value={selectedFiles.join(', ')} readOnly></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                    <input type="submit" value="Добавить" className="mt-6 block mx-auto select-none rounded-lg bg-neutral-600 py-2 px-4 text-center align-middle font-sans text-base font-bold uppercase text-white shadow-md transition-all hover:bg-neutral-500 focus:opacity-[0.85] active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50" />
                  </form>
                </div>
              </div>
            )}
          </div>
        </section>
        <section id="editAlbum">

          {isOwner && !txBeingSent && (
            <div>
              <h4 className="titleAlbum titleAlbumAdd text-7xl pt-8 block antialiased font-semibold leading-snug tracking-normal text-neutral-200">
                Редактирование альбома
              </h4>
              <div className="p-8 addDiv">
                <div className="max-w-full flex flex-col text-neutral-300">
                 
                  <form className="p-8 max-w-full mb-2 sm:w-auto" onSubmit={(event) => _handleUpdateAlbum(event)}>
                    <div className="grid lg:grid-cols-2 gap-6 xs:grid-cols-1">
                      
                      <div className="flex flex-col gap-6 mb-1 w-full">
                        <h6 className="custom-h6">
                          Индекс альбома
                        </h6>
                        <div className="relative h-11 w-full min-w-[200px]">
                          <input
                            type="number"
                            name="albumIndex"
                            placeholder="Введите индекс альбома"
                            className="custom-input peer transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0"
                          />
                          <label className="before:content[' '] after:content[' '] pointer-events-none absolute left-0 -top-1.5 flex h-full w-full select-none !overflow-visible truncate text-[11px] font-normal leading-tight text-neutral-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:leading-[4.1] peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-neutral-200"></label>
                        </div>

                        
                        <h6 className="custom-h6">
                          Название альбома
                        </h6>
                        <div className="relative h-11 w-full min-w-[200px]">
                          <input type="text" name="albumTitle" placeholder="название"
                            className="custom-input peer transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" />
                        </div>

                        <h6 className="custom-h6">
                          Исполнитель
                        </h6>
                        <div className="relative h-11 w-full min-w-[200px]">
                          <input type="text" name="albumExecutor" placeholder="исполнитель"
                            className="custom-input peer transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" />
                        </div>

                        <h6 className="custom-h6">
                          Цена
                        </h6>
                        <div className="relative h-11 w-full min-w-[200px]">
                          <input type="number" name="albumPrice" placeholder="цена"
                            className="custom-input peer transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" />
                        </div>

                        <h6 className="custom-h6">
                          Количество
                        </h6>
                        <div className="relative h-11 w-full min-w-[200px]">
                          <input type="number" name="albumQty" placeholder="шт."
                            className="custom-input peer transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" />
                        </div>
                      </div>


                      <div className="flex flex-col gap-6 mb-1 sm:col-span-1">
                        <h6 className="custom-h6">
                          Изображение
                        </h6>
                        <div>
                          <textarea name="albumImage" placeholder="названия"
                            className="custom-input peer  transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" id="multilineInput"></textarea>
                          <label></label>
                        </div>

                        <div>
                          <h6 className="custom-h6">
                            Выберите песни альбома:
                          </h6>
                          <div className="mt-6">
                            <input className="button font-sans text-base antialiased font-xs" type="file" id="fileInput" name="files" multiple onChange={handleFileChange} />
                            <textarea name="albumSongs" placeholder="названия"
                              className="mt-6 custom-input peer  transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0" id="multilineInput"
                              value={selectedFiles.join(', ')} readOnly></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                    <input
                      type="submit"
                      value="Обновить"
                      className="mt-6 block mx-auto select-none rounded-lg bg-neutral-600 py-2 px-4 text-center align-middle font-sans text-base font-bold uppercase text-white shadow-md transition-all hover:bg-neutral-500 focus:opacity-[0.85] active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50"
                    />
                  </form>
                </div>
              </div>
            </div>
          )}

        </section>

        <section>
          {isOwner && !txBeingSent && (
            <div>
              <h4 className="titleAlbum titleAlbumAdd text-7xl pt-8 block antialiased font-semibold leading-snug tracking-normal text-neutral-200">
                Удаление альбома
              </h4>
              <div className="p-8 addDiv">
                <div className="max-w-full flex flex-col text-neutral-300  ">

                  <form className="p-8 max-w-full mb-2 sm:w-auto" onSubmit={(event) => _handleDeleteAlbum(event)}>
                    <div className="flex flex-col gap-6 mb-1 w-full">
                      <h6 className="custom-h6">
                        Введите индекс альбома для удаления
                      </h6>
                      <div className="relative h-11 w-full min-w-[600px]">
                        <input
                          type="number"
                          name="albumIndexToDelete"
                          placeholder="Введите индекс альбома для удаления"
                          className=" custom-input peer transition-all placeholder-shown:border placeholder-shown:border-neutral-600 focus:border-2 focus:border-neutral-400 focus:outline-0"
                        />
                      </div>
                    </div>
                    <input
                      type="submit"
                      value="Удалить"
                      className="mt-6 block mx-auto select-none rounded-lg bg-red-600 py-2 px-4 text-center align-middle font-sans text-base font-bold uppercase text-white shadow-md transition-all hover:bg-red-500 focus:opacity-[0.85] active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50"
                    />
                  </form>
                </div>
              </div>
            </div>

          )}

        </section>
        <section id="slider2">
          {/*<h1>Все доступные альбомы</h1>
        <div className="albums-list">
          {renderAlbums(albums)} 
        </div> */}
          {currentConnection?.signer && !txBeingSent && (
            <div>
              <div className="bought-albums-list allAlbum">
                <h4 className="titleAlbum text-7xl pt-8 pb-8 block antialiased font-semibold leading-snug tracking-normal text-neutral-200">
                  Мои купленные альбомы
                </h4>

                <div className="AlbumCard  h-auto max-w-full "><div className="gridAlbum grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-3">
                  {renderAlbums(boughtAlbums)} 
                </div>
                </div>
              </div>
            </div>)}
        </section>
      </div >

      <footer>
        {!txBeingSent && (
          <div className="footerDiv">
            <div className="line_footer"></div>
            <div className="footerInfoRow1">
              <p className="copyright">
                © 2025 ЦепочкаЗвука. Все права защищены.
              </p>
            </div>
            <div className="footerInfoRow2">
              <span className="icon address-icon"></span>
              <p className="footerInfoP">г.Саранск, ул. Большевистская</p>
            </div>

            <div className="socialIcons">

              <a href="https://vk.com" target="_blank" rel="noopener noreferrer" className="icon-link vk" aria-label="ВКонтакте"></a>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="icon-link telegram" aria-label="Telegram"></a>
              <a href="mailto:a@mail.ru" className="icon-link mail" aria-label="Email"></a>
            </div>
          </div>)}
      </footer>

    </main >
  );
}