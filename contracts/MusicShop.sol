//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC165.sol";
import "hardhat/console.sol";

contract MusicShop is ERC165 {
    struct Album {
        uint256 index;
        bytes32 uid;
        string title;
        string executor;
        uint256 price;
        uint256 quantity;
        string image;
        string songs;
    }

    struct Order {
        uint256 orderId;
        bytes32 albumUid;
        address customer;
        uint256 orderedAt;
        OrderStatus status;
    }

    enum OrderStatus {
        Paid,
        Delivered
    }

    Album[] public albums;
    Order[] public orders;

    uint256 public currentIndex;
    uint256 public currentOrderId;

    address public owner;

    event AlbumBought(
        bytes32 indexed uid,
        address indexed customer,
        uint256 indexed timestamp
    );
    event OrderDelivered(bytes32 indexed albumUid, address indexed customer);
    event AlbumUpdated(
        uint256 indexed albumIndex,
        uint256 newPrice,
        uint256 newQuantity,
        string newTitle,
        string newExecutor,
        string newImage,
        string newSongs
    );
    event AlbumDeleted(uint256 indexed albumIndex, bytes32 albumUid);

    modifier onlyOwner() {
        require(msg.sender == owner, "not an owner!");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    function addAlbum(
        bytes32 uid,
        string calldata title,
        string calldata executor,
        uint256 price,
        uint256 quantity,
        string calldata image,
        string calldata songs
    ) external onlyOwner {
        albums.push(
            Album({
                index: currentIndex,
                uid: uid,
                title: title,
                executor: executor,
                price: price,
                quantity: quantity,
                image: image,
                songs: songs
            })
        );

        currentIndex++;
    }

    function buy(uint256 _index) external payable {
        Album storage albumToBuy = albums[_index];

        require(msg.value == albumToBuy.price, "invalid price");
        require(albumToBuy.quantity > 0, "out of stock!");

        albumToBuy.quantity--;

        orders.push(
            Order({
                orderId: currentOrderId,
                albumUid: albumToBuy.uid,
                customer: msg.sender,
                orderedAt: block.timestamp,
                status: OrderStatus.Paid
            })
        );

        currentOrderId++;

        emit AlbumBought(albumToBuy.uid, msg.sender, block.timestamp);
    }

    function delivered(uint256 _index) external onlyOwner {
        Order storage currentOrder = orders[_index];

        require(currentOrder.status != OrderStatus.Delivered, "invalid status");

        currentOrder.status = OrderStatus.Delivered;

        emit OrderDelivered(currentOrder.albumUid, currentOrder.customer);
    }

    receive() external payable {
        revert("Please use the buy function to purchase albums!");
    }

    function allAlbums() external view returns (Album[] memory) {
        uint totalAlbums = albums.length;
        uint count = 0;

        // Подсчет элементов с количеством > 0
        for (uint i = 0; i < totalAlbums; ++i) {
            //if (albums[i].quantity > 0) {
            count++;
            //}
        }

        Album[] memory albumsList = new Album[](count);
        uint256 j = 0;

        // Запись элементов с количеством > 0 в новый массив
        for (uint256 i = 0; i < totalAlbums; ++i) {
            //if (albums[i].quantity > 0) {
            albumsList[j] = albums[i];
            ++j;
            //}
        }

        return albumsList;
    }

    // Переменные контракта
    uint public albumsPerPage = 1; // Количество альбомов на странице

    // Функция для получения альбомов постранично
    function getAlbumsByPage( uint256 page ) external view returns (Album[] memory) {
        require(page > 0, "Page number should be greater than 0");

        uint startIndex = (page - 1) * albumsPerPage;
        uint endIndex = startIndex + albumsPerPage;

        if (endIndex > albums.length) {
            endIndex = albums.length;
        }

        uint[] memory filteredIndexes = new uint[](endIndex - startIndex);
        uint filteredCount = 0;

        for (uint i = startIndex; i < endIndex; i++) {
            //if (albums[i].quantity > 0) {
            filteredIndexes[filteredCount] = i;
            filteredCount++;
            // }
        }

        Album[] memory pageAlbums = new Album[](filteredCount);

        for (uint i = 0; i < filteredCount; i++) {
            pageAlbums[i] = albums[filteredIndexes[i]];
        }

        return pageAlbums;
    }
//получение купленных альбомов
    function getAlbumsBoughtBy(  address customer  ) external view returns (Album[] memory) {
        uint count = 0;

        // Сначала подсчитаем, сколько альбомов купил пользователь
        for (uint i = 0; i < orders.length; i++) {
            if (orders[i].customer == customer) {
                count++;
            }
        }

        // Создаем массив для хранения альбомов
        Album[] memory boughtAlbums = new Album[](count);
        uint index = 0;

        for (uint i = 0; i < orders.length; i++) {
            if (orders[i].customer == customer) {
                // Находим альбом по UID
                for (uint j = 0; j < albums.length; j++) {
                    if (albums[j].uid == orders[i].albumUid) {
                        boughtAlbums[index] = albums[j];
                        index++;
                        break;
                    }
                }
            }
        }

        return boughtAlbums;
    }

    // Функция для обновления альбома
    function updateAlbum(
        uint256 _index,
        uint256 newPrice,
        uint256 newQuantity,
        string calldata newTitle,
        string calldata newExecutor,
        string calldata newImage,
        string calldata newSongs
    ) external onlyOwner {
        require(_index < albums.length, "Album does not exist!");

        Album storage album = albums[_index];

        album.price = newPrice;
        album.quantity = newQuantity;
        album.title = newTitle;
        album.executor = newExecutor;
        album.image = newImage;
        album.songs = newSongs;

        emit AlbumUpdated(
            _index,
            newPrice,
            newQuantity,
            newTitle,
            newExecutor,
            newImage,
            newSongs
        );
    }

    // Функция для удаления альбома
    function deleteAlbum(uint256 _index) external onlyOwner {
        require(_index < albums.length, "Album does not exist!");

        bytes32 albumUid = albums[_index].uid;

        // Сдвигаем элементы массива, чтобы удалить альбом
        for (uint i = _index; i < albums.length - 1; i++) {
            albums[i] = albums[i + 1];
        }
        albums.pop(); // Убираем последний элемент, так как он был перенесен на предыдущую позицию

        emit AlbumDeleted(_index, albumUid);
    }

    fallback() external {
        console.logBytes(msg.data);
    }
}
